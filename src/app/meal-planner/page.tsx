
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
  Clock
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
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
import { Textarea } from "@/components/ui/textarea"
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
import { analyzeTextMeal } from "@/ai/flows/analyze-text-meal"
import { Badge } from "@/components/ui/badge"

// Standardized Macro Colors
const MACRO_COLORS = {
  protein: "hsl(var(--primary))",
  carbs: "hsl(38 92% 50%)",
  fat: "hsl(var(--accent))",
}

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  
  // Form State
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [calories, setCalories] = useState<string>("0")
  const [protein, setProtein] = useState<string>("0")
  const [carbs, setCarbs] = useState<string>("0")
  const [fat, setFat] = useState<string>("0")
  const [ingredients, setIngredients] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState<{ insight: string, ingredients: string[], instructions: string[] } | null>(null)
  const [activeRecipeName, setActiveRecipeName] = useState("")

  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  // Auto-recalculate calories when macros change (Only in Edit mode)
  useEffect(() => {
    if (editingMealId) {
      const p = parseFloat(protein) || 0;
      const c = parseFloat(carbs) || 0;
      const f = parseFloat(fat) || 0;
      const calculated = (p * 4) + (c * 4) + (f * 9);
      setCalories(Math.round(calculated).toString());
    }
  }, [protein, carbs, fat, editingMealId]);

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

      if (!editingMealId) {
        // AI Analysis Mode for new meals
        let userGoal: "Maintenance" | "Weight Loss" | "Weight Gain" = "Maintenance"
        if (profile?.bmiCategory === "Overweight" || profile?.bmiCategory === "Obese") userGoal = "Weight Loss"
        else if (profile?.bmiCategory === "Underweight") userGoal = "Weight Gain"

        const aiResult = await analyzeTextMeal({ mealName, userGoal });
        finalCalories = aiResult.calories
        finalProtein = aiResult.macros.protein
        finalCarbs = aiResult.macros.carbs
        finalFat = aiResult.macros.fat
        expertInsight = aiResult.expertInsight
        description = aiResult.description
        healthScore = aiResult.healthScore
        finalIngredients = aiResult.ingredients
        instructions = aiResult.instructions
      }

      const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
      const finalTime = timeMap[mealType] || "12:00 PM";

      const mealData: any = {
        name: mealName,
        type: mealType,
        time: finalTime,
        calories: finalCalories,
        macros: {
          protein: finalProtein,
          carbs: finalCarbs,
          fat: finalFat
        },
        healthScore,
        description,
        expertInsight,
        ingredients: finalIngredients,
        instructions: instructions.length > 0 ? instructions : (editingMealId ? (scheduledMeals?.find(m => m.id === editingMealId)?.instructions || []) : []),
        source: "planner",
        reminderEnabled,
        updatedAt: serverTimestamp()
      }

      if (editingMealId) {
        const oldMeal = scheduledMeals?.find(m => m.id === editingMealId)
        if (oldMeal) {
          setDocumentNonBlocking(dailyLogRef, {
            caloriesConsumed: increment(finalCalories - (oldMeal.calories || 0)),
            proteinTotal: increment(finalProtein - (oldMeal.macros?.protein || 0)),
            carbsTotal: increment(finalCarbs - (oldMeal.macros?.carbs || 0)),
            fatTotal: increment(finalFat - (oldMeal.macros?.fat || 0))
          }, { merge: true });
        }
        updateDocumentNonBlocking(doc(mealsColRef, editingMealId), mealData);
        toast({ title: "Schedule Updated", description: "Changes synced to your daily plan." })
      } else {
        addDocumentNonBlocking(mealsColRef, { ...mealData, createdAt: serverTimestamp() });
        setDocumentNonBlocking(dailyLogRef, {
          date: dateId,
          caloriesConsumed: increment(finalCalories),
          proteinTotal: increment(finalProtein),
          carbsTotal: increment(finalCarbs),
          fatTotal: increment(finalFat)
        }, { merge: true });
        toast({ title: "Meal Scheduled", description: `${mealName} analyzed and synced.` })
      }
      resetForm()
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Analysis Error", description: "Could not analyze meal. Try again." });
    } finally {
      setIsSaving(false);
    }
  }

  const resetForm = () => {
    setMealName("")
    setMealType("Breakfast")
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
    setMealType(meal.type || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setCalories(meal.calories?.toString() || "0")
    setProtein(meal.macros?.protein?.toString() || "0")
    setCarbs(meal.macros?.carbs?.toString() || "0")
    setFat(meal.macros?.fat?.toString() || "0")
    setIngredients(meal.ingredients?.join(", ") || "")
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = async (meal: any) => {
    if (!user || !mealsColRef || !dailyLogRef) return
    try {
      deleteDocumentNonBlocking(doc(mealsColRef, meal.id));
      setDocumentNonBlocking(dailyLogRef, {
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

  const handleGetRecipe = (meal: any) => {
    setActiveRecipeName(meal.name)
    setIsRecipeDialogOpen(true)
    
    // Use pre-saved instructions if available
    setActiveRecipe({
      insight: meal.expertInsight || "A balanced meal designed for your specific health targets.",
      ingredients: meal.ingredients && meal.ingredients.length > 0 ? meal.ingredients : ["Fresh seasonal ingredients"],
      instructions: meal.instructions && meal.instructions.length > 0 ? meal.instructions : [
        "Prepare all fresh ingredients by washing and chopping.",
        "Sauté or steam protein source until cooked through.",
        "Arrange the meal elements for optimal presentation.",
        "Season lightly with herbs and serve fresh."
      ]
    })
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-8 pb-32 min-h-screen relative animate-in fade-in duration-700 overflow-x-hidden text-center">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Plan</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Strategic Daily Menu</p>
      </header>
      
      <div className="flex flex-wrap items-center gap-4 justify-center">
        <Button variant="outline" onClick={handleToday} className="rounded-full h-10 px-6 font-black uppercase text-[9px] tracking-widest border-2 border-border shadow-sm hover:bg-secondary transition-all text-foreground">
          Today
        </Button>
        
        <div className="flex items-center bg-white rounded-full border-2 border-border shadow-sm p-1">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 rounded-full hover:bg-secondary"><ChevronLeft className="h-5 w-5 text-foreground" /></Button>
          <div className="px-4 font-black text-[9px] uppercase tracking-widest min-w-[140px] text-center text-foreground">
            {format(date, "EEEE, MMM d")}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 rounded-full hover:bg-secondary"><ChevronRight className="h-5 w-5 text-foreground" /></Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-foreground hover:bg-primary/90 h-10 px-8 font-black uppercase text-[9px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 border-none">
              <Plus className="w-4 h-4 mr-2" /> Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[92vw] max-w-lg flex flex-col max-h-[90vh] md:left-[calc(50%+8rem)]">
            <DialogHeader className="bg-primary p-6 text-foreground text-center shrink-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">
                {editingMealId ? "Refine Meal" : "New Schedule"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar text-left">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Timing</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger className="h-12 rounded-2xl font-black border-2 border-border text-foreground">
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
                
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Meal Description</Label>
                  <Input placeholder="e.g. Grilled Salmon with Asparagus" className="h-12 rounded-2xl font-black border-2 border-border text-foreground" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                </div>

                {editingMealId && (
                  <div className="space-y-4 pt-4 border-t-2 border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Nutritional Adjustment</Label>
                      <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-foreground">{calories} KCAL</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: MACRO_COLORS.protein }}>Protein (g)</Label>
                        <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} className="h-10 rounded-xl border-2 border-border font-black text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: MACRO_COLORS.carbs }}>Carbs (g)</Label>
                        <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="h-10 rounded-xl border-2 border-border font-black text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: MACRO_COLORS.fat }}>Fat (g)</Label>
                        <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="h-10 rounded-xl border-2 border-border font-black text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Ingredients</Label>
                      <Textarea 
                        placeholder="e.g. Salmon, Asparagus, Lemon" 
                        className="rounded-2xl border-2 border-border font-black min-h-[80px] text-xs" 
                        value={ingredients} 
                        onChange={(e) => setIngredients(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border-2 border-transparent hover:border-border transition-all">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Smart Alerts</Label>
                    <p className="text-[8px] text-foreground opacity-50 font-black uppercase tracking-tighter">Notify before meal time.</p>
                  </div>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 shrink-0">
              <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-premium text-foreground border-none">
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin w-5 h-5" />
                    AI ANALYSIS...
                  </div>
                ) : editingMealId ? "Sync Changes" : "Confirm Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tighter flex items-center gap-4 px-2 uppercase text-left text-foreground">
          <Clock className="w-7 h-7 text-foreground opacity-80" />
          YOUR SCHEDULE
        </h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              sortedMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden hover:shadow-premium-lg transition-all group">
                  <CardContent className="p-6 sm:p-8 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6 flex-1 w-full text-left">
                      <div className="min-w-[100px] border-r-2 border-border/50 pr-6 hidden sm:block">
                        <p className="text-xl font-black text-foreground opacity-40 tracking-tighter uppercase">{meal.time}</p>
                      </div>
                      <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-black tracking-tighter uppercase leading-none text-foreground group-hover:text-primary transition-colors">
                          {meal.name}
                        </h3>
                        <div className="flex flex-row items-center gap-6">
                          <p className="text-[11px] font-black text-foreground opacity-60 uppercase tracking-widest">+{Math.round(meal.calories)} KCAL</p>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                              <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.protein }}>PROTEIN {meal.macros?.protein}G</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                              <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.carbs }}>CARBS {meal.macros?.carbs}G</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                              <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.fat }}>FAT {meal.macros?.fat}G</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleGetRecipe(meal)} 
                        className="text-foreground hover:bg-primary/20 rounded-lg h-9 w-9 border border-border bg-secondary/20 shadow-sm transition-all active:scale-90"
                      >
                        <ChefHat className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(meal)} 
                        className="text-foreground opacity-50 hover:bg-secondary rounded-lg h-9 w-9 border border-border shadow-sm transition-all active:scale-90"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteMeal(meal)} 
                        className="text-foreground opacity-50 hover:text-destructive rounded-lg h-9 w-9 border border-border shadow-sm transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-border/30 flex flex-col items-center justify-center shadow-sm px-6">
                <Utensils className="w-12 h-12 mb-4 text-foreground opacity-10" />
                <p className="text-foreground opacity-60 font-black text-lg uppercase tracking-tighter">Your timeline is clear.</p>
                <p className="text-[10px] text-foreground opacity-30 font-black uppercase tracking-[0.4em] mt-2">PLAN A MEAL BELOW</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-6">
        <Link href="/planner">
          <Card className="rounded-[2rem] bg-primary/20 border-2 border-primary/30 text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]">
            <CardContent className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="text-[8px] font-black uppercase text-foreground opacity-70 tracking-[0.2em]">FEELING INDECISIVE?</p>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none text-foreground">AI DECISION HUB</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-primary text-foreground px-4 h-9 rounded-xl font-black uppercase text-[8px] tracking-widest shadow-xl shadow-primary/20 group-hover:bg-primary/90 transition-all border-none shrink-0">
                EXPLORE <ChevronRightIcon className="w-3.5 h-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[4rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] max-h-[92vh] flex flex-col md:left-[calc(50%+8rem)]">
          <DialogHeader className="bg-primary p-12 text-foreground shrink-0 rounded-t-[4rem]">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-tight text-center">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-10 overflow-y-auto flex-1 no-scrollbar text-left">
            <ScrollArea className="h-full pr-6">
              {activeRecipe ? (
                <div className="space-y-12">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-foreground font-black text-[12px] uppercase tracking-widest">
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
