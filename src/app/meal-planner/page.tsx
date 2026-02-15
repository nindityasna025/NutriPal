"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Utensils, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  ChevronRightIcon,
  Edit2,
  ChefHat,
  ShoppingBag,
  ListOrdered,
  Clock,
  Bell,
  CheckCircle2
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { analyzeTextMeal } from "@/ai/flows/analyze-text-meal"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MACRO_COLORS = {
  protein: "hsl(var(--primary))",
  carbs: "hsl(38 92% 50%)",
  fat: "hsl(var(--accent))",
}

const TIMING_OPTIONS = [
  { value: "Breakfast", label: "Breakfast", defaultTime: "08:00 AM" },
  { value: "Lunch", label: "Lunch", defaultTime: "12:30 PM" },
  { value: "Dinner", label: "Dinner", defaultTime: "07:00 PM" },
  { value: "Snack", label: "Snack", defaultTime: "04:00 PM" },
]

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  
  const [mealName, setMealName] = useState("")
  const [mealTiming, setMealTiming] = useState("Breakfast")
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [calories, setCalories] = useState<string>("0")
  const [protein, setProtein] = useState<string>("0")
  const [carbs, setCarbs] = useState<string>("0")
  const [fat, setFat] = useState<string>("0")
  const [ingredients, setIngredients] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState<{ 
    id: string,
    status: string,
    calories: number,
    macros: any,
    insight: string, 
    ingredients: string[], 
    instructions: string[], 
    allergenWarning?: string 
  } | null>(null)
  const [activeRecipeName, setActiveRecipeName] = useState("")

  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  const dateId = date ? format(date, "yyyy-MM-dd") : ""
  
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const dailyLogRef = useMemoFirebase(() => (user && dateId) ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, [user, firestore, dateId])
  const mealsColRef = useMemoFirebase(() => (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

  const { data: profile } = useDoc(profileRef)
  const { data: scheduledMeals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  const sortedMeals = useMemo(() => {
    if (!scheduledMeals) return null;
    return [...scheduledMeals].sort((a, b) => {
      const timeToMinutes = (t: string) => {
        if (!t) return 0;
        const parts = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!parts) return 0;
        let hours = parseInt(parts[1], 10);
        const minutes = parseInt(parts[2], 10);
        const ampm = parts[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  }, [scheduledMeals]);

  const handlePrevDay = () => date && setDate(subDays(date, 1))
  const handleNextDay = () => date && setDate(addDays(date, 1))
  const handleToday = () => setDate(startOfToday())

  const handleSaveMeal = async () => {
    if (!user || !mealsColRef || !mealName || !dailyLogRef) return
    setIsSaving(true)
    
    try {
      let finalCalories = parseFloat(calories)
      let finalProtein = parseFloat(protein)
      let finalCarbs = parseFloat(carbs)
      let finalFat = parseFloat(fat)
      let expertInsight = ""
      let description = ""
      let healthScore = 85
      let finalIngredients: string[] = ingredients.split(",").map(i => i.trim()).filter(i => i !== "")
      let instructions: string[] = []
      let allergenWarning = ""

      if (!editingMealId) {
        const aiResult = await analyzeTextMeal({ 
          mealName: `${mealTiming}: ${mealName}`, 
          userGoal: "Maintenance",
          userAllergies: profile?.allergies,
          userRestrictions: profile?.dietaryRestrictions
        });

        finalCalories = aiResult.calories
        finalProtein = aiResult.macros.protein
        finalCarbs = aiResult.macros.carbs
        finalFat = aiResult.macros.fat
        expertInsight = aiResult.expertInsight
        description = aiResult.description
        healthScore = aiResult.healthScore
        finalIngredients = aiResult.ingredients
        instructions = aiResult.instructions
        allergenWarning = aiResult.allergenWarning || ""
      }

      const finalTime = editingMealId 
        ? (scheduledMeals?.find(m => m.id === editingMealId)?.time || format(new Date(), "hh:mm a").toUpperCase())
        : (TIMING_OPTIONS.find(t => t.value === mealTiming)?.defaultTime || format(new Date(), "hh:mm a").toUpperCase());

      const mealData: any = {
        name: mealName,
        time: finalTime,
        timing: mealTiming,
        calories: finalCalories,
        macros: { protein: finalProtein, carbs: finalCarbs, fat: finalFat },
        healthScore,
        description,
        expertInsight,
        ingredients: finalIngredients,
        instructions: instructions,
        allergenWarning,
        source: editingMealId ? (scheduledMeals?.find(m => m.id === editingMealId)?.source || "planner") : "planner",
        reminderEnabled,
        status: editingMealId ? (scheduledMeals?.find(m => m.id === editingMealId)?.status || "planned") : "planned",
        updatedAt: serverTimestamp()
      }

      if (editingMealId) {
        updateDocumentNonBlocking(doc(mealsColRef, editingMealId), mealData);
        toast({ title: "Schedule Updated", description: "Changes synced." })
      } else {
        addDocumentNonBlocking(mealsColRef, { ...mealData, createdAt: serverTimestamp() });
        toast({ title: "Meal Scheduled", description: `${mealName} added.` })
      }
      resetForm()
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Action Failed", description: "Try again later." });
    } finally {
      setIsSaving(false);
    }
  }

  const markAsConsumed = (meal: any) => {
    if (!user || !mealsColRef || !dailyLogRef || meal.status === 'consumed') return

    setDocumentNonBlocking(dailyLogRef, {
      date: dateId,
      caloriesConsumed: increment(meal.calories),
      proteinTotal: increment(meal.macros?.protein || 0),
      carbsTotal: increment(meal.macros?.carbs || 0),
      fatTotal: increment(meal.macros?.fat || 0)
    }, { merge: true });

    updateDocumentNonBlocking(doc(mealsColRef, meal.id), { status: "consumed", updatedAt: serverTimestamp() });
    toast({ title: "Meal Recorded", description: `${meal.name} tracked.` });
    if (activeRecipe?.id === meal.id) setIsRecipeDialogOpen(false);
  }

  const resetForm = () => {
    setMealName("")
    setMealTiming("Breakfast")
    setCalories("0")
    setProtein("0")
    setCarbs("0")
    setFat("0")
    setIngredients("")
    setEditingMealId(null)
    setIsDialogOpen(false)
    setIsSaving(false)
  }

  const openEditDialog = (meal: any) => {
    setEditingMealId(meal.id)
    setMealName(meal.name)
    setMealTiming(meal.timing || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setCalories(meal.calories?.toString() || "0")
    setProtein(meal.macros?.protein?.toString() || "0")
    setCarbs(meal.macros?.carbs?.toString() || "0")
    setFat(meal.macros?.fat?.toString() || "0")
    setIngredients(meal.ingredients?.join(", ") || "")
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = async (meal: any) => {
    if (!user || !mealsColRef) return
    deleteDocumentNonBlocking(doc(mealsColRef, meal.id));
    toast({ variant: "destructive", title: "Meal Removed", description: `${meal.name} taken off schedule.` })
  }

  const handleGetRecipe = (meal: any) => {
    setActiveRecipeName(meal.name)
    setIsRecipeDialogOpen(true)
    setActiveRecipe({
      id: meal.id,
      status: meal.status,
      calories: meal.calories,
      macros: meal.macros,
      insight: meal.expertInsight || "Health-focused choice.",
      ingredients: meal.ingredients || [],
      instructions: meal.instructions || [],
      allergenWarning: meal.allergenWarning
    })
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-32 min-h-screen text-center animate-in fade-in duration-700">
      <header className="space-y-1 pt-safe text-center">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Plan</h1>
        <p className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-40">Menu Management</p>
      </header>
      
      <div className="flex flex-wrap items-center gap-4 justify-center">
        <Button variant="outline" onClick={handleToday} className="rounded-full h-10 px-6 font-black uppercase text-[9px] tracking-widest border-2 border-border text-foreground">Today</Button>
        <div className="flex items-center bg-white rounded-full border-2 border-border shadow-sm p-1">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 rounded-full"><ChevronLeft className="h-5 w-5 text-foreground" /></Button>
          <div className="px-4 font-black text-[9px] uppercase tracking-widest min-w-[120px] text-center text-foreground">{format(date, "MMM d")}</div>
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 rounded-full"><ChevronRight className="h-5 w-5 text-foreground" /></Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-foreground hover:bg-primary/90 h-10 px-8 font-black uppercase text-[9px] tracking-widest shadow-xl border-none">
              <Plus className="w-4 h-4 mr-2" /> Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[92vw] max-w-lg flex flex-col max-h-[90vh]">
            <DialogHeader className="bg-primary p-6 text-foreground text-center shrink-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">
                {editingMealId ? "Refine Meal" : "New Schedule"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar text-left">
              <div className="grid gap-4">
                {!editingMealId && (
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Timing Category</Label>
                    <Select value={mealTiming} onValueChange={setMealTiming}>
                      <SelectTrigger className="h-12 rounded-2xl font-black border-2 border-border">
                        <SelectValue placeholder="Select Timing" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-border z-[200]">
                        {TIMING_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="font-black uppercase text-[10px] tracking-widest">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Meal Name</Label>
                  <Input placeholder="e.g. Avocado Toast" className="h-12 rounded-2xl font-black border-2 border-border text-foreground" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border-2 border-transparent hover:border-border transition-all">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Smart Alerts</Label>
                    <p className="text-[8px] text-foreground opacity-50 font-black uppercase tracking-tighter">Notify before meal.</p>
                  </div>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 shrink-0">
              <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground border-none">
                {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : editingMealId ? "Sync Changes" : "Schedule Meal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-black tracking-tighter flex items-center gap-3 px-2 uppercase text-left text-foreground">
          <Clock className="w-6 h-6 text-foreground opacity-80" /> SCHEDULE
        </h2>
        <div className="space-y-3">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              sortedMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium bg-white rounded-[1.5rem] overflow-hidden hover:shadow-premium-lg transition-all group">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 w-full text-left">
                      <div className="min-w-[80px] border-r border-border/50 pr-4 hidden sm:block">
                        <p className="text-lg font-black text-foreground opacity-40 tracking-tighter uppercase">{meal.time}</p>
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black tracking-tighter uppercase leading-none text-foreground group-hover:text-primary transition-colors">{meal.name}</h3>
                          {meal.status === 'consumed' && (
                            <Badge className="h-4 px-1.5 text-[7px] font-black uppercase bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> CONSUMED
                            </Badge>
                          )}
                          {meal.reminderEnabled && meal.status !== 'consumed' && <Bell className="w-3.5 h-3.5 text-primary fill-primary/20" />}
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <p className="text-[9px] font-black text-foreground opacity-60 uppercase tracking-widest">+{Math.round(meal.calories)} KCAL</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.protein }}>Protein {meal.macros?.protein}g</span>
                            <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.carbs }}>Carbs {meal.macros?.carbs}g</span>
                            <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.fat }}>Fat {meal.macros?.fat}g</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {meal.source === 'planner' && (
                        <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal)} className="text-foreground hover:bg-primary/20 rounded-lg h-8 w-8 border border-border bg-secondary/20 shadow-sm transition-all active:scale-90">
                          <ChefHat className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-foreground opacity-50 hover:bg-secondary rounded-lg h-8 w-8 border border-border shadow-sm transition-all active:scale-90"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal)} className="text-foreground opacity-50 hover:text-destructive rounded-lg h-8 w-8 border border-border shadow-sm transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16 bg-white/50 rounded-[2rem] border-2 border-dashed border-border/30 flex flex-col items-center justify-center">
                <Utensils className="w-10 h-10 mb-4 text-foreground opacity-10" />
                <p className="text-foreground opacity-40 font-black text-sm uppercase tracking-widest">Empty Schedule</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-4">
        <Link href="/planner">
          <Card className="rounded-[1.5rem] bg-primary/20 border-2 border-primary/30 text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]">
            <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="text-[8px] font-black uppercase text-foreground opacity-70 tracking-[0.2em]">DECISION ENGINE</p>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none text-foreground">AI DISCOVERY</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-primary text-foreground px-4 h-9 rounded-xl font-black uppercase text-[8px] tracking-widest shadow-xl border-none shrink-0">
                EXPLORE <ChevronRightIcon className="w-3.5 h-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] max-h-[92vh] flex flex-col">
          <DialogHeader className="bg-primary p-10 text-foreground shrink-0 rounded-t-[2.5rem]">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-tight text-center">{activeRecipeName}</DialogTitle>
          </DialogHeader>
          <div className="p-8 overflow-y-auto flex-1 no-scrollbar text-left">
            <ScrollArea className="h-full pr-4">
              {activeRecipe && (
                <div className="space-y-10">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest"><Sparkles className="w-5 h-5 text-primary" /> INSIGHT</div>
                    <p className="text-sm font-bold leading-relaxed text-foreground opacity-90 bg-primary/10 p-6 rounded-[1.5rem] border border-primary/20">{activeRecipe.insight}</p>
                  </section>
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest"><ShoppingBag className="w-5 h-5 text-primary" /> INGREDIENTS</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-black text-foreground opacity-90"><div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />{ing}</div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-6 pb-6">
                    <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest"><ListOrdered className="w-5 h-5 text-primary" /> INSTRUCTIONS</div>
                    <div className="space-y-6">
                      {activeRecipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-black text-foreground shrink-0 border border-primary/30">{i + 1}</div>
                          <p className="text-sm font-black text-foreground opacity-90 leading-relaxed pt-1.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="p-8 pt-0 shrink-0">
             {activeRecipe?.status !== 'consumed' ? (
               <Button onClick={() => markAsConsumed(activeRecipe)} className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-premium text-foreground border-none">COOKED</Button>
             ) : (
               <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-premium text-foreground border-none opacity-50">DONE</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
