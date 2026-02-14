
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
  Camera,
  X,
  ShoppingBag,
  ListOrdered
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, updateDoc, setDoc, deleteDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import Image from "next/image"
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
  protein: "hsl(var(--primary))",
  carbs: "hsl(38 92% 50%)",
  fat: "hsl(var(--accent))",
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
  const [mealImageUrl, setMealImageUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const mealsColRef = useMemoFirebase(() => (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

  const { data: profile } = useDoc(profileRef)
  const { data: scheduledMeals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  // Sort meals pagi -> malam
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
    if (!user || !mealsColRef || !mealName) return
    setIsSaving(true)
    
    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    const mealData = {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 450,
      macros: { protein: 25, carbs: 45, fat: 15 },
      healthScore: 85,
      description: "Custom meal scheduled for peak metabolic performance.",
      source: "planner",
      reminderEnabled,
      imageUrl: mealImageUrl,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingMealId) {
        await updateDoc(doc(mealsColRef, editingMealId), mealData);
        toast({ title: "Schedule Updated", description: "Your daily plan has been refined." })
      } else {
        await setDoc(doc(mealsColRef), { ...mealData, createdAt: serverTimestamp() });
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
    setMealImageUrl(null)
    setIsDialogOpen(false)
    setIsSaving(false)
  }

  const openEditDialog = (meal: any) => {
    setEditingMealId(meal.id)
    setMealName(meal.name)
    setMealType(meal.type || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setMealImageUrl(meal.imageUrl || null)
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = async (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    try {
      await deleteDoc(doc(mealsColRef, mealId));
      toast({ variant: "destructive", title: "Meal Removed", description: `${mealName} taken off your schedule.` })
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <div className="space-y-1 w-full lg:w-auto">
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase lg:text-left text-center">Plan</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60 lg:text-left text-center">Strategic Daily Menu</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-11 px-6 font-black uppercase text-[9px] tracking-widest border-border shadow-sm hover:bg-secondary/50 transition-all">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-4 font-black text-[10px] uppercase tracking-widest min-w-[140px] text-center">{format(date, "EEEE, MMM d")}</div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw] max-w-lg flex flex-col">
              <DialogHeader className="bg-primary p-8 text-primary-foreground text-center shrink-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">
                  {editingMealId ? "Refine Meal" : "New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="grid gap-5">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Timing</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-[1.25rem] font-bold border-muted-foreground/10">
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
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Description</Label>
                    <Input placeholder="e.g. Grilled Salmon" className="h-12 rounded-[1.25rem] font-bold border-primary/10" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center justify-between p-5 bg-secondary/30 rounded-[1.5rem]">
                    <div className="space-y-0.5 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Smart Alerts</Label>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase">Notify 15m before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-8 pt-0 shrink-0">
                <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-premium">
                  {isSaving ? <Loader2 className="animate-spin" /> : editingMealId ? "Sync Changes" : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-lg font-black tracking-tight px-1 uppercase text-left">Your Schedule</h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : sortedMeals && sortedMeals.length > 0 ? (
              sortedMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[2.5rem] overflow-hidden bg-white">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-8 flex-1">
                         <div className="text-center min-w-[100px] border-r pr-8 border-border hidden sm:block">
                           <p className="text-xl font-black text-primary/40 leading-none">{meal.time}</p>
                         </div>
                         <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-4">
                              <div className="space-y-1 text-left">
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-xl font-black tracking-tight uppercase leading-tight">{meal.name}</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+{meal.calories} KCAL</p>
                                   <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} /><span className="text-[10px] font-black uppercase" style={{ color: MACRO_COLORS.protein }}>Protein {meal.macros?.protein}g</span></div>
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} /><span className="text-[10px] font-black uppercase" style={{ color: MACRO_COLORS.carbs }}>Carbs {meal.macros?.carbs}g</span></div>
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} /><span className="text-[10px] font-black uppercase" style={{ color: MACRO_COLORS.fat }}>Fat {meal.macros?.fat}g</span></div>
                                   </div>
                                </div>
                              </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                         {meal.source === 'planner' && (
                           <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal.name)} className="text-primary hover:bg-primary/10 rounded-xl h-10 w-10 border border-primary/10 shadow-sm"><ChefHat className="w-5 h-5" /></Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-muted-foreground hover:bg-secondary rounded-xl h-10 w-10 border border-border/50"><Edit2 className="w-4 h-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-xl h-10 w-10 border border-border/50"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-24 bg-white/40 rounded-[3rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center shadow-sm px-8">
                <Utensils className="w-16 h-16 mb-4 text-muted-foreground/10" />
                <p className="text-muted-foreground font-black text-lg uppercase tracking-tight">Your timeline is clear.</p>
                <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest mt-1">Plan a meal below.</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-6">
        <Link href="/planner">
          <Card className="rounded-[3rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] border-2 border-primary/20">
            <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-8 flex-1">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.3em] opacity-80 mb-0.5">Feeling Indecisive?</p>
                  <h3 className="text-2xl font-black uppercase leading-tight">AI Decision Hub</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed max-w-sm">
                    Let AI analyze delivery deals or curate a menu instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary text-primary-foreground px-6 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                Explore AI Hub <ChevronRightIcon className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="bg-primary p-6 sm:p-8 text-primary-foreground shrink-0">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-tight text-center">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1">
            <ScrollArea className="h-full pr-4">
              {generatingRecipe ? (
                <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Retrieving Recipe...</p>
                </div>
              ) : activeRecipe ? (
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
                  <CardContent className="p-8 space-y-8 text-left">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest text-left">
                        <Sparkles className="w-4 h-4" /> Expert Insight
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-muted-foreground bg-primary/5 p-5 rounded-2xl border border-primary/10">
                        {activeRecipe.insight}
                      </p>
                    </section>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                        <ShoppingBag className="w-4 h-4 text-primary" /> Ingredients
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        {activeRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                            {ing}
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                        <ListOrdered className="w-4 h-4 text-primary" /> Cooking Path
                      </div>
                      <div className="space-y-5">
                        {activeRecipe.instructions.map((step, i) => (
                          <div key={i} className="flex gap-4 items-start">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed pt-1">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </CardContent>
                </Card>
              ) : null}
            </ScrollArea>
          </div>
          <DialogFooter className="p-8 pt-0 shrink-0">
             <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-premium">Return to Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
