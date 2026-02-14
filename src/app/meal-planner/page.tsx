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

  // Chronological sort: pagi to malam
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative animate-in fade-in duration-700">
      <header className="flex flex-col items-center gap-6 text-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">PLAN</h1>
          <p className="text-[10px] font-black text-foreground uppercase tracking-[0.4em] opacity-60">STRATEGIC DAILY MENU</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 justify-center">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] border-border shadow-sm hover:bg-secondary/50 transition-all text-foreground">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronLeft className="h-5 w-5 text-foreground" /></Button>
            <div className="px-6 font-black text-[10px] uppercase tracking-[0.2em] min-w-[160px] text-center text-foreground">
              {format(date, "EEEE, MMM d")}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronRight className="h-5 w-5 text-foreground" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-foreground hover:bg-primary/90 h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw] max-w-lg flex flex-col">
              <DialogHeader className="bg-primary p-8 text-foreground text-center shrink-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">
                  {editingMealId ? "Refine Meal" : "New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="grid gap-5">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Timing</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-[1.25rem] font-black border-muted-foreground/10 text-foreground">
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
                    <Label className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60 ml-1">Meal Description</Label>
                    <Input placeholder="e.g. Grilled Salmon" className="h-12 rounded-[1.25rem] font-black border-primary/10 text-foreground" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center justify-between p-5 bg-secondary/30 rounded-[1.5rem]">
                    <div className="space-y-0.5 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Smart Alerts</Label>
                      <p className="text-[9px] text-foreground opacity-60 font-black uppercase">Notify 15m before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-8 pt-0 shrink-0">
                <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-premium text-foreground">
                  {isSaving ? <Loader2 className="animate-spin" /> : editingMealId ? "Sync Changes" : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xs font-black tracking-[0.2em] px-1 uppercase text-left text-foreground opacity-80">YOUR SCHEDULE</h2>
        <div className="space-y-5">
          {isLoadingMeals ? (
            <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              sortedMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[2.5rem] overflow-hidden bg-white group">
                  <CardContent className="p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-10 flex-1 w-full">
                         <div className="text-left min-w-[120px] border-r border-border/50 pr-10 hidden sm:block">
                           <p className="text-xl font-black text-foreground opacity-40 tracking-tighter">{meal.time}</p>
                         </div>
                         <div className="space-y-3 flex-1 text-left">
                            <h3 className="text-xl font-black tracking-tight uppercase leading-none text-foreground group-hover:text-primary transition-colors">
                              {meal.name}
                            </h3>
                            <div className="flex flex-col gap-2">
                               <p className="text-[11px] font-black text-foreground opacity-60 uppercase tracking-widest">+{meal.calories} KCAL</p>
                               <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} /><span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.protein }}>PROTEIN {meal.macros?.protein}G</span></div>
                                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} /><span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.carbs }}>CARBS {meal.macros?.carbs}G</span></div>
                                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} /><span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.fat }}>FAT {meal.macros?.fat}G</span></div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                         {meal.source === 'planner' && (
                           <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal.name)} className="text-foreground hover:bg-primary/20 rounded-xl h-10 w-10 border border-border bg-secondary/10 shadow-sm transition-all"><ChefHat className="w-5 h-5" /></Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-foreground opacity-60 hover:bg-secondary rounded-xl h-10 w-10 border border-border shadow-sm transition-all"><Edit2 className="w-4 h-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-foreground opacity-60 hover:text-destructive rounded-xl h-10 w-10 border border-border shadow-sm transition-all"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-32 bg-white/40 rounded-[3rem] border-2 border-dashed border-border/30 flex flex-col items-center justify-center shadow-sm px-8">
                <Utensils className="w-20 h-20 mb-6 text-foreground opacity-10" />
                <p className="text-foreground opacity-60 font-black text-xl uppercase tracking-tight">Your timeline is clear.</p>
                <p className="text-[10px] text-foreground opacity-30 font-black uppercase tracking-[0.4em] mt-2">PLAN A MEAL BELOW</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-8">
        <Link href="/planner">
          <Card className="rounded-[3rem] bg-primary/25 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] border-2 border-primary/40">
            <CardContent className="p-10 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-10 flex-1">
                <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0 border border-primary/20">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2 text-left">
                  <p className="text-[10px] font-black uppercase text-foreground opacity-80 tracking-[0.4em] mb-1">FEELING INDECISIVE?</p>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none text-foreground">AI DECISION HUB</h3>
                  <p className="text-foreground opacity-70 font-black text-xs uppercase tracking-widest leading-relaxed max-w-sm">
                    LET AI ANALYZE DELIVERY DEALS OR CURATE A MENU INSTANTLY.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary text-foreground px-8 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 group-hover:bg-primary/90 transition-all">
                EXPLORE AI HUB <ChevronRightIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="bg-primary p-8 text-foreground shrink-0">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-tight text-center">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 overflow-y-auto flex-1 no-scrollbar">
            <ScrollArea className="h-full pr-4">
              {generatingRecipe ? (
                <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-60">RETRIEVING RECIPE...</p>
                </div>
              ) : activeRecipe ? (
                <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                  <CardContent className="p-10 space-y-10 text-left">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-foreground font-black text-[11px] uppercase tracking-[0.2em] text-left">
                        <Sparkles className="w-5 h-5 text-primary" /> EXPERT INSIGHT
                      </div>
                      <p className="text-sm font-black leading-relaxed text-foreground opacity-80 bg-primary/5 p-7 rounded-[2rem] border border-primary/10">
                        {activeRecipe.insight}
                      </p>
                    </section>
                    <section className="space-y-5">
                      <div className="flex items-center gap-2 text-foreground font-black text-[11px] uppercase tracking-[0.2em]">
                        <ShoppingBag className="w-5 h-5 text-primary" /> INGREDIENTS
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {activeRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-4 text-xs font-black text-foreground opacity-80">
                            <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                            {ing}
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 text-foreground font-black text-[11px] uppercase tracking-[0.2em]">
                        <ListOrdered className="w-5 h-5 text-primary" /> COOKING PATH
                      </div>
                      <div className="space-y-6">
                        {activeRecipe.instructions.map((step, i) => (
                          <div key={i} className="flex gap-5 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-black text-foreground shrink-0 border border-primary/20">
                              {i + 1}
                            </div>
                            <p className="text-[13px] font-black text-foreground opacity-80 leading-relaxed pt-1">
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
             <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-premium text-foreground">RETURN TO SCHEDULE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
