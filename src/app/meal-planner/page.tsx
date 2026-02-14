"use client"

import { useState, useEffect } from "react"
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
  Trophy, 
  Bell, 
  BellOff, 
  ChevronRightIcon,
  Bike,
  CheckCircle2
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { generateDailyPlan, type GenerateDailyPlanOutput } from "@/ai/flows/generate-daily-plan"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, setDoc } from "firebase/firestore"
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [aiPlan, setAiPlan] = useState<GenerateDailyPlanOutput | null>(null)
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  const dateId = date ? format(date, "yyyy-MM-dd") : ""
  
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const mealsColRef = useMemoFirebase(() => 
    (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, 
    [user, firestore, dateId]
  )

  const { data: profile } = useDoc(profileRef)
  const { data: scheduledMeals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  const handlePrevDay = () => date && setDate(subDays(date, 1))
  const handleNextDay = () => date && setDate(addDays(date, 1))
  const handleToday = () => setDate(startOfToday())

  const handleAddMeal = async () => {
    if (!user || !mealsColRef || !mealName) return
    setIsSaving(true)
    
    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    addDocumentNonBlocking(mealsColRef, {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 438,
      macros: { protein: 12, carbs: 33, fat: 18 },
      healthScore: 78,
      description: "Scheduled for energy balance throughout your day.",
      source: "planner",
      reminderEnabled,
      createdAt: serverTimestamp()
    })
    setMealName(""); setIsDialogOpen(false); setIsSaving(false)
    toast({ title: "Schedule Added", description: `${mealName} is on the menu.` })
  }

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    deleteDocumentNonBlocking(doc(mealsColRef, mealId))
    toast({ variant: "destructive", title: "Meal Deleted", description: `${mealName} removed from schedule.` })
  }

  const handleGenerateAiPlan = async () => {
    if (!profile) return
    setGeneratingPlan(true)
    try {
      const result = await generateDailyPlan({
        calorieTarget: profile.calorieTarget || 2000,
        proteinPercent: profile.proteinTarget || 30,
        carbsPercent: profile.carbsTarget || 40,
        fatPercent: profile.fatTarget || 30,
        dietType: profile.dietaryRestrictions?.[0],
        allergies: profile.allergies
      })
      setAiPlan(result)
      toast({ title: "AI Plan Ready", description: "Explore your custom daily recommendations." })
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Busy", description: "NutriPal AI is currently over capacity." })
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleApplyAiPlan = async () => {
    if (!aiPlan || !mealsColRef || !user) return
    const meals = [aiPlan.breakfast, aiPlan.lunch, aiPlan.dinner]
    for (const meal of meals) {
      await setDoc(doc(mealsColRef), {
        ...meal,
        source: "AI Plan",
        createdAt: serverTimestamp(),
        reminderEnabled: true
      })
    }
    setAiPlan(null)
    toast({ title: "Plan Applied", description: "Today's schedule has been updated with AI recommendations." })
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-safe md:pt-8 animate-in fade-in duration-700">
        <div className="space-y-1 w-full lg:w-auto text-center lg:text-left">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Plan</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Weekly Nutrition Organizer</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-12 px-5 font-black uppercase text-[10px] tracking-widest border-border shadow-sm hover:bg-secondary/50 transition-all shrink-0">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-4 font-black text-[11px] uppercase tracking-widest min-w-[160px] text-center">{format(date, "EEEE, MMM d")}</div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0"><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem]">
              <DialogHeader><DialogTitle className="text-2xl font-black text-center pt-4 uppercase tracking-tight">Schedule Meal</DialogTitle></DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Time</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger className="h-12 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Breakfast">Breakfast</SelectItem>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Snack">Snack</SelectItem>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
                  <Input placeholder="e.g. Avocado Toast" className="h-12 rounded-2xl font-bold" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black uppercase tracking-widest">Set Reminder</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Notify me 15 mins before meal time.</p>
                  </div>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
              </div>
              <DialogFooter className="pb-4">
                <Button onClick={handleAddMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">
                  {isSaving ? <Loader2 className="animate-spin" /> : "Save Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Your Schedule Section */}
      <section className="space-y-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight px-2 uppercase text-center lg:text-left">Your Schedule</h2>
        <div className="space-y-6">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              scheduledMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[2.5rem] overflow-hidden bg-white">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-8 flex-1">
                         <div className="text-center min-w-[100px] border-r pr-8 border-border hidden sm:block">
                           <p className="text-xl font-black text-primary/40">{meal.time}</p>
                         </div>
                         <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-2xl font-black tracking-tight uppercase leading-tight">{meal.name}</h3>
                              {meal.reminderEnabled ? <Bell className="w-3.5 h-3.5 text-primary shrink-0" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-4">
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+{meal.calories} KCAL</p>
                               <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[10px] font-black uppercase text-red-500">{meal.macros?.protein}g Pro</span></div>
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /><span className="text-[10px] font-black uppercase text-yellow-600">{meal.macros?.carbs}g Cho</span></div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-full"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 sm:py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center shadow-sm px-6">
                <Utensils className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-muted-foreground/10" />
                <p className="text-muted-foreground font-bold text-base sm:text-lg uppercase">No meals scheduled for this day.</p>
              </div>
            )}
        </div>
      </section>

      {/* Feeling Indecisive? Section (Moved below Your Schedule) */}
      <section className="space-y-8">
        <h2 className="text-2xl font-black tracking-tight px-2 uppercase text-center lg:text-left">Feeling Indecisive?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/planner">
            <Card className="rounded-[2.5rem] bg-primary/10 border-none text-foreground shadow-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full">
              <CardContent className="p-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm shrink-0">
                    <Bike className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase leading-tight">Delivery AI</h3>
                    <p className="text-muted-foreground font-medium text-xs leading-tight">Curate healthy meals from Grab/Gojek delivery apps.</p>
                  </div>
                </div>
                <ChevronRightIcon className="w-6 h-6 opacity-20 text-primary shrink-0" />
              </CardContent>
            </Card>
          </Link>

          <Card 
            onClick={handleGenerateAiPlan}
            className={cn(
              "rounded-[2.5rem] bg-accent/10 border-none text-foreground shadow-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full",
              generatingPlan && "opacity-70 pointer-events-none"
            )}
          >
            <CardContent className="p-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm shrink-0">
                  {generatingPlan ? <Loader2 className="w-7 h-7 text-accent animate-spin" /> : <Sparkles className="w-7 h-7 text-accent" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase leading-tight">Daily Menu AI</h3>
                  <p className="text-muted-foreground font-medium text-xs leading-tight">Generate a structured daily menu based on your BMR/TDEE.</p>
                </div>
              </div>
              <ChevronRightIcon className="w-6 h-6 opacity-20 text-accent shrink-0" />
            </CardContent>
          </Card>
        </div>

        {aiPlan && (
          <Card className="rounded-[3rem] border-none shadow-premium-lg bg-white overflow-hidden animate-in zoom-in duration-500">
            <CardContent className="p-8 sm:p-12 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight">AI Recommended Plan</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calculated from your {profile?.bmiCategory} Profile</p>
                </div>
                <Button onClick={handleApplyAiPlan} className="rounded-full bg-primary text-primary-foreground font-black uppercase text-[10px] px-8 h-12 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Apply to Today
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { time: "Breakfast", data: aiPlan.breakfast },
                  { time: "Lunch", data: aiPlan.lunch },
                  { time: "Dinner", data: aiPlan.dinner }
                ].map((meal, i) => (
                  <div key={i} className="space-y-4 p-6 bg-secondary/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all">
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{meal.time}</p>
                    <div className="space-y-1">
                      <h4 className="font-black text-lg uppercase leading-tight">{meal.data.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground">{meal.data.calories} KCAL</p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-muted/50">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Swap Suggestion</p>
                      <p className="text-[11px] font-medium italic opacity-80 leading-relaxed">"{meal.data.swapSuggestion}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
