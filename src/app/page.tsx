
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Flame, 
  Droplets, 
  ChevronRight, 
  Utensils,
  Loader2,
  History,
  Plus,
  Minus,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Watch,
  ChevronLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trophy,
  Info
} from "lucide-react"
import { format, addDays, subDays, startOfToday, isSameDay } from "date-fns"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

// Mock data for fallback
const MOCK_MEALS = [
  { 
    id: "m1", 
    name: "Kuetiau Goreng", 
    calories: 438, 
    time: "08:40 AM", 
    source: "PHOTO",
    macros: { protein: 17, carbs: 74, fat: 19 },
    healthScore: 62,
    description: "This meal provides a good mix of carbohydrates from the noodles, moderate protein from egg and veggies, and some fats. Adding a source of lean protein next time could enhance the balance.",
    ingredients: ["Stir fried noodles", "Carrot", "Egg", "Bean sprouts", "Soy sauce"],
    tips: "Balance for Weight Maintenance: This provides roughly 22% of your daily energy needs. High in sodium, consider drinking extra water."
  },
  { 
    id: "m2", 
    name: "Avocado & Egg Toast", 
    calories: 320, 
    time: "11:30 AM", 
    source: "PHOTO",
    macros: { protein: 12, carbs: 28, fat: 18 },
    healthScore: 85,
    description: "Perfect balance of healthy fats and protein.",
    ingredients: ["Sourdough", "Avocado", "Egg", "Lemon juice"],
    tips: "Great start to your day! The healthy fats from avocado will keep you full until lunch."
  }
]

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>("m1")

  useEffect(() => {
    setSelectedDate(startOfToday())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isUserLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isUserLoading, mounted, router])

  const dateId = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

  const profileRef = useMemoFirebase(() => 
    user ? doc(firestore, "users", user.uid, "profile", "main") : null, 
    [user, firestore]
  )
  const dailyLogRef = useMemoFirebase(() => 
    (user && dateId) ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, 
    [user, firestore, dateId]
  )
  const mealsColRef = useMemoFirebase(() => 
    (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, 
    [user, firestore, dateId]
  )

  const { data: profile } = useDoc(profileRef)
  const { data: dailyLog } = useDoc(dailyLogRef)
  const { data: meals } = useCollection(mealsColRef)

  const handlePrevDay = () => selectedDate && setSelectedDate(subDays(selectedDate, 1))
  const handleNextDay = () => selectedDate && setSelectedDate(addDays(selectedDate, 1))

  if (!mounted || isUserLoading || !user || !selectedDate) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg animate-pulse">NutriPal is syncing...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 438)
  const burned = dailyLog?.caloriesBurned || 450
  const water = dailyLog?.waterIntake || 1.7
  
  const proteinPercent = 25
  const carbsPercent = 45
  const fatPercent = 30

  const caloriePercent = Math.min(100, Math.round((consumed / calorieTarget) * 100))
  
  const getCalorieStatus = () => {
    if (consumed === 0) return { label: "NOT STARTED", color: "text-muted-foreground" };
    if (consumed >= calorieTarget - 100 && consumed <= calorieTarget + 100) return { label: "GOAL MET", color: "text-green-600" };
    if (consumed > calorieTarget + 100) return { label: "OVER GOAL", color: "text-red-500" };
    return { label: "UNDER GOAL", color: "text-primary" };
  }

  const calorieStatus = getCalorieStatus();

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  const getSuggestion = () => {
    if (water < 2.0) return "You're a bit low on hydration. Try to drink 2 more glasses before dinner!";
    if (burned > 600 && consumed < calorieTarget - 500) return "High activity detected! Consider a protein-rich snack for recovery.";
    return "You're doing great! Consistency is key to reaching your wellness goals.";
  }

  const displayMeals = (meals && meals.length > 0) ? meals : (isSameDay(selectedDate, startOfToday()) ? MOCK_MEALS : [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 w-full md:w-auto text-left">
          <h1 className="text-4xl font-black tracking-tight text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground font-medium">Welcome back! Here is your daily wellness report:</p>
        </div>
        
        <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-10 w-10 rounded-full hover:bg-secondary/50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-6 py-2 font-bold text-sm min-w-[200px] justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>{format(selectedDate, "EEEE, MMM d")}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-10 w-10 rounded-full hover:bg-secondary/50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Calorie Tracker</CardTitle>
              <span className={cn("font-black text-[9px] uppercase tracking-widest", calorieStatus.color)}>
                {calorieStatus.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex items-baseline gap-2">
              <h1 className="text-5xl font-black tracking-tighter leading-none">{consumed}</h1>
              <span className="text-lg font-bold text-muted-foreground">/ {calorieTarget} kcal</span>
            </div>
            <div className="space-y-3">
              <Progress value={caloriePercent} className="h-2 rounded-full bg-secondary" />
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                <span>{caloriePercent}% Goal Reached</span>
                <span>{Math.max(0, calorieTarget - consumed)} kcal left</span>
              </div>
            </div>

            <div className="pt-6 border-t border-muted/50">
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 text-left">Daily Macro Goals</p>
               <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-red-500">Protein</span> <span>{proteinPercent}%</span></div>
                    <Progress value={proteinPercent} className="h-1 bg-red-50" indicatorClassName="bg-red-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-yellow-500">Carbs</span> <span>{carbsPercent}%</span></div>
                    <Progress value={carbsPercent} className="h-1 bg-yellow-50" indicatorClassName="bg-yellow-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-blue-500">Fat</span> <span>{fatPercent}%</span></div>
                    <Progress value={fatPercent} className="h-1 bg-blue-50" indicatorClassName="bg-blue-400" />
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] relative overflow-hidden group">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2 h-full">
              <div className="p-3 bg-red-50 rounded-2xl">
                <Flame className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Burned Today</p>
              <h3 className="text-3xl font-black tracking-tight">{burned} <span className="text-xs font-bold text-muted-foreground">kcal</span></h3>
              <div className="flex items-center gap-1.5 pt-1">
                <Watch className="w-3 h-3 text-primary" />
                <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Connect Apple Health</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem]">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
              <div className="p-3 bg-blue-50 rounded-2xl mb-2">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Water</p>
              <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-8 w-8 rounded-full border border-primary/20"><Minus className="w-4 h-4" /></Button>
                 <h3 className="text-2xl font-black tracking-tight">{water} <span className="text-xs font-bold text-muted-foreground">L</span></h3>
                 <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5"><Plus className="w-4 h-4 text-primary" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Daily Food Report Section */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <History className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Daily Food Report</h2>
          </div>
          <Button variant="link" size="sm" className="text-primary font-black text-[10px] uppercase tracking-[0.2em] hover:no-underline">View All</Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <div key={meal.id} className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                {/* Header Card */}
                <Card 
                  className="rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white cursor-pointer"
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <CardContent className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-green-500" strokeWidth={2.5} />
                      </div>
                      <h3 className="font-black text-3xl tracking-tight leading-tight">{meal.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Calories</p>
                      <p className="font-black text-4xl tracking-tighter text-primary">+{meal.calories}</p>
                    </div>
                  </CardContent>
                </Card>

                {expandedMeal === meal.id && (
                  <>
                    {/* Macros Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-8 bg-red-50/50 rounded-[2rem] text-center border border-red-100/50">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Protein</p>
                        <p className="text-3xl font-black text-red-600 tracking-tight">{meal.macros?.protein}g</p>
                      </div>
                      <div className="p-8 bg-yellow-50/50 rounded-[2rem] text-center border border-yellow-100/50">
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Carbs</p>
                        <p className="text-3xl font-black text-yellow-600 tracking-tight">{meal.macros?.carbs}g</p>
                      </div>
                      <div className="p-8 bg-blue-50/50 rounded-[2rem] text-center border border-blue-100/50">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Fat</p>
                        <p className="text-3xl font-black text-blue-600 tracking-tight">{meal.macros?.fat}g</p>
                      </div>
                    </div>

                    {/* Rich Details Card */}
                    <Card className="rounded-[3rem] border-none shadow-lg bg-white overflow-hidden">
                      <CardContent className="p-10 space-y-10">
                        {/* Health Benefit Header */}
                        <div className="flex items-center justify-between border-b border-border/50 pb-8">
                           <div className="flex items-center gap-4">
                              <Trophy className="text-primary w-8 h-8" />
                              <span className="text-2xl font-black tracking-tight">Health Benefit</span>
                           </div>
                           <div className="flex items-center gap-6">
                              <span className="text-4xl font-black text-primary/80">{meal.healthScore || 75}/100</span>
                              <Progress value={meal.healthScore || 75} className="w-32 h-2.5 rounded-full" />
                           </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                            <Info className="w-3.5 h-3.5" /> Description
                          </div>
                          <p className="text-lg font-medium text-foreground/80 leading-relaxed italic pr-4">
                            "{meal.description}"
                          </p>
                        </div>

                        {/* Ingredients */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Ingredients Detected</p>
                          <div className="flex flex-wrap gap-2.5">
                            {(meal.ingredients || []).map((ing, i) => (
                              <Badge key={i} variant="secondary" className="bg-secondary/40 text-muted-foreground font-bold text-xs border-none px-5 py-2.5 rounded-2xl">{ing}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* AI Recommendation Box */}
                        <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                           <p className="text-xs font-black text-primary uppercase tracking-[0.1em] mb-2">AI Recommendation</p>
                           <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                             {meal.tips || "Based on your activity levels and profile, this meal is a solid choice for maintaining your current metabolic rate."}
                           </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted flex flex-col items-center justify-center">
              <Utensils className="w-16 h-16 mb-4 text-muted-foreground/10" />
              <p className="text-muted-foreground font-bold text-lg">No meals logged for this date.</p>
              <Button onClick={() => router.push("/record")} variant="link" className="mt-2 text-primary font-black uppercase text-[10px] tracking-widest">Log a Meal Now</Button>
            </div>
          )}
        </div>
      </section>

      {/* Smart Insight Card */}
      <section className="pt-6">
        <Card className="rounded-[2.5rem] border-none bg-primary/10 shadow-xl shadow-primary/5 overflow-hidden group">
          <CardContent className="p-10 flex flex-col md:flex-row items-center gap-10 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-40 h-40 text-primary" />
            </div>
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shrink-0">
              <Lightbulb className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left z-10">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h2 className="text-xl font-black tracking-tight">Smart Daily Insight</h2>
                <Badge className="bg-primary text-primary-foreground font-black text-[8px] uppercase tracking-widest border-none px-2 py-0.5">AI POWERED</Badge>
              </div>
              <p className="text-lg font-medium text-foreground/70 leading-relaxed italic max-w-2xl">"{getSuggestion()}"</p>
              <Button onClick={() => router.push("/meal-planner")} className="bg-white text-primary hover:bg-white/90 rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg border-none">
                OPTIMIZE MY SCHEDULE <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
