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
  ListOrdered
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, updateDoc, setDoc, deleteDoc, increment } from "firebase/firestore"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

// Standardized Macro Colors
const MACRO_COLORS = {
  protein: "hsl(var(--primary))", // Forest Green
  carbs: "hsl(38 92% 50%)",      // Amber
  fat: "hsl(var(--accent))",     // Teal/Lime
}

// Dummy Recipe Database
const DUMMY_RECIPES: Record<string, { insight: string, ingredients: string[], instructions: string[] }> = {
  "default": {
    insight: "This balanced meal is optimized for your health goals. It provides a high-quality Protein profile that supports muscle recovery while maintaining a stable glycemic response.",
    ingredients: ["Fresh seasonal protein", "Complex carbohydrates", "Healthy fats", "Fiber-rich greens"],
    instructions: ["Prepare the main Protein source with light seasoning.", "Steam or lightly sauté the greens to preserve nutrients.", "Assemble the base with complex grains.", "Combine all elements and garnish."]
  }
}

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [generatingRecipe, setGeneratingRecipe] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState<{ insight: string, ingredients: string[], instructions: string[] } | null>(null)
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
    
    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    const calories = 450;
    const protein = 25;
    const carbs = 45;
    const fat = 15;

    const mealData = {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories,
      macros: { protein, carbs, fat },
      healthScore: 85,
      description: "Custom meal scheduled for peak metabolic performance.",
      source: "planner",
      reminderEnabled,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingMealId) {
        await updateDoc(doc(mealsColRef, editingMealId), mealData);
        toast({ title: "Schedule Updated", description: "Your daily plan has been refined." })
      } else {
        await setDoc(doc(mealsColRef), { ...mealData, createdAt: serverTimestamp() });
        await setDoc(dailyLogRef, {
          date: dateId,
          caloriesConsumed: increment(calories),
          proteinTotal: increment(protein),
          carbsTotal: increment(carbs),
          fatTotal: increment(fat)
        }, { merge: true });
        toast({ title: "Meal Scheduled", description: `${mealName} is now on your timeline.` })
      }
      resetForm()
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Save Error", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  const resetForm = () => {
    setMealName("")
    setEditingMealId(null)
    setIsDialogOpen(false)
    setIsSaving(false)
  }

  const openEditDialog = (meal: any) => {
    setEditingMealId(meal.id)
    setMealName(meal.name)
    setMealType(meal.type || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = async (meal: any) => {
    if (!user || !mealsColRef || !dailyLogRef) return
    try {
      await deleteDoc(doc(mealsColRef, meal.id));
      await setDoc(dailyLogRef, {
        caloriesConsumed: increment(-(meal.calories || 0)),
        proteinTotal: increment(-(meal.macros?.protein || 0)),
        carbsTotal: increment(-(meal.macros?.carbs || 0)),
        fatTotal: increment(-(meal.macros?.fat || 0))
      }, { merge: true });
      toast({ variant: "destructive", title: "Meal Removed", description: `${meal.name} taken off your schedule.` })
    } catch (err: any) {
      console.error(err);
    }
  }

  const handleGetRecipe = async (mealName: string) => {
    setActiveRecipeName(mealName)
    setGeneratingRecipe(true)
    setIsRecipeDialogOpen(true)
    
    setTimeout(() => {
      const recipe = DUMMY_RECIPES[mealName] || DUMMY_RECIPES["default"]
      setActiveRecipe(recipe)
      setGeneratingRecipe(false)
    }, 800)
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative animate-in fade-in duration-700">
      <header className="flex flex-col items-center gap-8 text-center">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">PLAN</h1>
          <p className="text-[12px] font-black text-foreground uppercase tracking-[0.5em] opacity-50">STRATEGIC DAILY MENU</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 justify-center">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-12 px-10 font-black uppercase text-[11px] tracking-widest border-2 border-border shadow-sm hover:bg-secondary transition-all text-foreground">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border-2 border-border shadow-sm p-1.5">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-10 w-10 rounded-full hover:bg-secondary"><ChevronLeft className="h-6 w-6 text-foreground" /></Button>
            <div className="px-8 font-black text-[11px] uppercase tracking-widest min-w-[180px] text-center text-foreground">
              {format(date, "EEEE, MMM d")}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-10 w-10 rounded-full hover:bg-secondary"><ChevronRight className="h-6 w-6 text-foreground" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-foreground hover:bg-primary/90 h-12 px-10 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 border-none">
                <Plus className="w-5 h-5 mr-3" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[92vw] max-w-lg flex flex-col">
              <DialogHeader className="bg-primary p-10 text-foreground text-center shrink-0">
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-center">
                  {editingMealId ? "Refine Meal" : "New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-10 space-y-8 overflow-y-auto flex-1">
                <div className="grid gap-6">
                  <div className="space-y-2 text-left">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Timing</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-14 rounded-2xl font-black border-2 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Meal Description</Label>
                    <Input placeholder="e.g. Grilled Salmon" className="h-14 rounded-2xl font-black border-2 border-border text-foreground" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-secondary/30 rounded-[2rem] border-2 border-transparent hover:border-border transition-all">
                    <div className="space-y-1 text-left">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-foreground">Smart Alerts</Label>
                      <p className="text-[10px] text-foreground opacity-50 font-black uppercase tracking-tighter">Notify 15m before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-10 pt-0 shrink-0">
                <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-premium text-foreground border-none">
                  {isSaving ? <Loader2 className="animate-spin" /> : editingMealId ? "Sync Changes" : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="space-y-8">
        <h2 className="text-[11px] font-black tracking-[0.3em] px-2 uppercase text-left text-foreground opacity-60">YOUR SCHEDULE</h2>
        <div className="space-y-6">
          {isLoadingMeals ? (
            <div className="flex justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              sortedMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[3rem] overflow-hidden bg-white group">
                  <CardContent className="p-8 sm:p-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
                      <div className="flex items-center gap-12 flex-1 w-full">
                         <div className="text-left min-w-[140px] border-r-2 border-border/50 pr-12 hidden sm:block">
                           <p className="text-3xl font-black text-foreground opacity-40 tracking-tighter">{meal.time}</p>
                         </div>
                         <div className="space-y-4 flex-1 text-left">
                            <h3 className="text-3xl font-black tracking-tighter uppercase leading-none text-foreground group-hover:text-primary transition-colors">
                              {meal.name}
                            </h3>
                            <div className="flex flex-col gap-2">
                               <p className="text-[12px] font-black text-foreground opacity-60 uppercase tracking-widest">+{meal.calories} KCAL</p>
                               <div className="flex flex-wrap items-center gap-6">
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} /><span className="text-[11px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.protein }}>PROTEIN {meal.macros?.protein}G</span></div>
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} /><span className="text-[11px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.carbs }}>CARBS {meal.macros?.carbs}G</span></div>
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} /><span className="text-[11px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.fat }}>FAT {meal.macros?.fat}G</span></div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                         {meal.source === 'planner' && (
                           <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal.name)} className="text-foreground hover:bg-primary/20 rounded-2xl h-12 w-12 border-2 border-border bg-secondary/20 shadow-sm transition-all active:scale-90"><ChefHat className="w-6 h-6" /></Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-foreground opacity-50 hover:bg-secondary rounded-2xl h-12 w-12 border-2 border-border shadow-sm transition-all active:scale-90"><Edit2 className="w-5 h-5" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal)} className="text-foreground opacity-50 hover:text-destructive rounded-2xl h-12 w-12 border-2 border-border shadow-sm transition-all active:scale-90"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-40 bg-white/50 rounded-[4rem] border-4 border-dashed border-border/30 flex flex-col items-center justify-center shadow-sm px-10">
                <Utensils className="w-24 h-24 mb-8 text-foreground opacity-10" />
                <p className="text-foreground opacity-60 font-black text-2xl uppercase tracking-tighter">Your timeline is clear.</p>
                <p className="text-[12px] text-foreground opacity-30 font-black uppercase tracking-[0.5em] mt-4">PLAN A MEAL BELOW</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-12">
        <Link href="/planner">
          <Card className="rounded-[4rem] bg-primary/25 border-4 border-primary/40 text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]">
            <CardContent className="p-12 sm:p-16 flex flex-col sm:flex-row items-center justify-between gap-12">
              <div className="flex items-center gap-12 flex-1">
                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0 border-2 border-primary/30">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-3 text-left">
                  <p className="text-[12px] font-black uppercase text-foreground opacity-70 tracking-[0.5em] mb-1">FEELING INDECISIVE?</p>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-foreground">AI DECISION HUB</h3>
                  <p className="text-foreground opacity-80 font-black text-sm uppercase tracking-widest leading-relaxed max-w-md">
                    LET AI ANALYZE DELIVERY DEALS OR CURATE A MENU INSTANTLY.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-primary text-foreground px-10 h-16 rounded-[1.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-primary/30 group-hover:bg-primary/90 transition-all border-none">
                EXPLORE AI HUB <ChevronRightIcon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[4rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] max-h-[92vh] flex flex-col">
          <DialogHeader className="bg-primary p-12 text-foreground shrink-0 rounded-t-[4rem]">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-tight text-center">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 overflow-y-auto flex-1 no-scrollbar">
            <ScrollArea className="h-full pr-6">
              {generatingRecipe ? (
                <div className="flex flex-col items-center justify-center h-[500px] space-y-6">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-foreground opacity-60">RETRIEVING RECIPE...</p>
                </div>
              ) : activeRecipe ? (
                <div className="space-y-12 text-left">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-foreground font-black text-[12px] uppercase tracking-widest text-left">
                      <Sparkles className="w-6 h-6 text-primary" /> EXPERT INSIGHT
                    </div>
                    <p className="text-[15px] font-bold leading-relaxed text-foreground opacity-90 bg-primary/10 p-10 rounded-[2.5rem] border-2 border-primary/20">
                      {activeRecipe.insight}
                    </p>
                  </section>
                  <section className="space-y-8">
                    <div className="flex items-center gap-3 text-foreground font-black text-[12px] uppercase tracking-widest">
                      <ShoppingBag className="w-6 h-6 text-primary" /> INGREDIENTS
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
                      {activeRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-5 text-sm font-black text-foreground opacity-90">
                          <div className="w-3 h-3 rounded-full bg-primary/50 shrink-0" />
                          {ing}
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-8 pb-10">
                    <div className="flex items-center gap-3 text-foreground font-black text-[12px] uppercase tracking-widest">
                      <ListOrdered className="w-6 h-6 text-primary" /> COOKING PATH
                    </div>
                    <div className="space-y-10">
                      {activeRecipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-8 items-start">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-[14px] font-black text-foreground shrink-0 border-2 border-primary/30">
                            {i + 1}
                          </div>
                          <p className="text-[15px] font-black text-foreground opacity-90 leading-relaxed pt-2">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </ScrollArea>
          </div>
          <DialogFooter className="p-12 pt-0 shrink-0">
             <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-[12px] shadow-premium text-foreground border-none">RETURN TO SCHEDULE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}