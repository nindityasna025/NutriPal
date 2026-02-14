
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ShoppingBag
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { generateRecipe } from "@/ai/flows/generate-recipe"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null)
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
      updatedAt: serverTimestamp()
    }

    if (editingMealId) {
      updateDocumentNonBlocking(doc(mealsColRef, editingMealId), mealData)
      toast({ title: "Schedule Updated", description: "Your daily plan has been refined." })
    } else {
      addDocumentNonBlocking(mealsColRef, { ...mealData, createdAt: serverTimestamp() })
      toast({ title: "Meal Scheduled", description: `${mealName} is now on your timeline.` })
    }

    setMealName(""); setEditingMealId(null); setIsDialogOpen(false); setIsSaving(false)
  }

  const openEditDialog = (meal: any) => {
    setEditingMealId(meal.id)
    setMealName(meal.name)
    setMealType(meal.type || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    deleteDocumentNonBlocking(doc(mealsColRef, mealId))
    toast({ variant: "destructive", title: "Meal Removed", description: `${mealName} taken off your schedule.` })
  }

  const handleGetRecipe = async (mealName: string) => {
    setActiveRecipeName(mealName)
    setGeneratingRecipe(true)
    setIsRecipeDialogOpen(true)
    try {
      const result = await generateRecipe({ mealName, dietaryRestrictions: profile?.dietaryRestrictions || [] })
      setActiveRecipe(result.recipe)
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Error", description: "Could not fetch recipe instructions." })
      setIsRecipeDialogOpen(false)
    } finally {
      setGeneratingRecipe(false)
    }
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-safe md:pt-8 animate-in fade-in duration-700">
        <div className="space-y-1 w-full lg:w-auto text-center lg:text-left">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Plan</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Strategic Daily Menu</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-center lg:justify-end">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-14 px-8 font-black uppercase text-[10px] tracking-widest border-border shadow-sm hover:bg-secondary/50 transition-all">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1.5">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-11 w-11 rounded-full hover:bg-secondary/50"><ChevronLeft className="h-5 w-5" /></Button>
            <div className="px-6 font-black text-[12px] uppercase tracking-widest min-w-[180px] text-center">{format(date, "EEEE, MMM d")}</div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-11 w-11 rounded-full hover:bg-secondary/50"><ChevronRight className="h-5 w-5" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingMealId(null); setMealName(""); } }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background">
              <DialogHeader className="bg-primary p-10 text-primary-foreground text-center">
                <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                  {editingMealId ? "Refine Meal" : "New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-10 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Timing</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-14 rounded-[1.5rem] font-bold border-muted-foreground/10">
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
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Description</Label>
                    <Input placeholder="e.g. Grilled Salmon with Asparagus" className="h-14 rounded-[1.5rem] font-bold border-primary/10" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-secondary/30 rounded-[2rem]">
                    <div className="space-y-1">
                      <Label className="text-xs font-black uppercase tracking-widest">Smart Alerts</Label>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Notify 15m before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-10 pt-0">
                <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-premium">
                  {isSaving ? <Loader2 className="animate-spin" /> : editingMealId ? "Sync Changes" : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Your Daily Agenda - Structured List */}
      <section className="space-y-10">
        <h2 className="text-2xl font-black tracking-tight px-2 uppercase text-center lg:text-left">Your Agenda</h2>
        <div className="space-y-6">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              scheduledMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[3rem] overflow-hidden bg-white">
                  <CardContent className="p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-10 flex-1">
                         <div className="text-center min-w-[120px] border-r pr-10 border-border hidden sm:block">
                           <p className="text-2xl font-black text-primary/40 leading-none">{meal.time}</p>
                         </div>
                         <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight">{meal.name}</h3>
                              <Badge className={cn(
                                "rounded-xl font-black text-[9px] uppercase tracking-widest border-none px-3 py-1",
                                meal.source === 'planner' ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"
                              )}>
                                {meal.source === 'planner' ? 'COOK' : meal.source}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                               <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">+{meal.calories} KCAL</p>
                               <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[11px] font-black uppercase text-red-500">{meal.macros?.protein}g Protein</span></div>
                                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-[11px] font-black uppercase text-yellow-600">{meal.macros?.carbs}g Carbs</span></div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                         {meal.source === 'planner' ? (
                           <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal.name)} className="text-primary hover:bg-primary/10 rounded-2xl h-12 w-12 border border-primary/10 shadow-sm"><ChefHat className="w-6 h-6" /></Button>
                         ) : (
                           <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 rounded-2xl h-12 w-12 border border-green-200 shadow-sm"><ShoppingBag className="w-6 h-6" /></Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-muted-foreground hover:bg-secondary rounded-2xl h-12 w-12 border border-border/50"><Edit2 className="w-5 h-5" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-2xl h-12 w-12 border border-border/50"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-32 bg-white/40 rounded-[4rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center shadow-sm px-10">
                <Utensils className="w-20 h-20 mb-6 text-muted-foreground/10" />
                <p className="text-muted-foreground font-black text-xl uppercase tracking-tighter">Your timeline is clear.</p>
                <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest mt-2">Plan a meal or ask the AI for a decision relief below.</p>
              </div>
            )}
        </div>
      </section>

      {/* Decision Fatigue Relief Hub - Routing to Explore Hub */}
      <section className="space-y-10">
        <h2 className="text-2xl font-black tracking-tight px-2 uppercase text-center lg:text-left">Feeling Indecisive?</h2>
        <Link href="/planner">
          <Card className="rounded-[4rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] border-2 border-primary/20">
            <CardContent className="p-12 sm:p-16 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-10 flex-1">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black uppercase leading-tight">AI Decision Hub</h3>
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest leading-relaxed max-w-md">
                    Let our expert AI analyze delivery deals or curate a full BMR-matched menu instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-primary text-primary-foreground px-8 h-16 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                Explore AI Hub <ChevronRightIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* AI Recipe Dialog - Standardized Component */}
      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[4rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[95vw]">
          <DialogHeader className="bg-primary p-12 text-primary-foreground">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-3">Professional Kitchen Guide</h3>
            <DialogTitle className="text-4xl font-black uppercase tracking-tight leading-tight">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-12">
            <ScrollArea className="h-[450px] pr-6">
              {generatingRecipe ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Formulating precise instructions...</p>
                </div>
              ) : activeRecipe ? (
                <div className="prose prose-sm prose-green max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed font-bold text-foreground/80 text-base sm:text-lg">
                    {activeRecipe}
                  </div>
                </div>
              ) : null}
            </ScrollArea>
          </div>
          <DialogFooter className="p-12 pt-0">
             <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-18 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-premium">Return to Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
