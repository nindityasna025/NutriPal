
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Watch
} from "lucide-react"
import { format, addDays, subDays, startOfToday, eachDayOfInterval, isSameDay } from "date-fns"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

// Mock data updated with rich details
const MOCK_MEALS = [
  { 
    id: "m1", 
    name: "Organic Tofu Soba Noodles", 
    calories: 380, 
    time: "08:40 AM", 
    source: "GRABFOOD",
    macros: { protein: 18, carbs: 54, fat: 12 },
    healthScore: 92,
    description: "Heart-healthy. Soba noodles are low GI, tofu provides plant protein.",
    ingredients: ["Soba noodles", "Organic tofu", "Broccoli", "Shitake mushrooms"]
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
    ingredients: ["Sourdough", "Avocado", "Egg", "Lemon juice"]
  },
  { 
    id: "m3", 
    name: "Bubur Ayam Spesial", 
    calories: 400, 
    time: "02:10 PM", 
    source: "GOFOOD",
    macros: { protein: 15, carbs: 60, fat: 10 },
    healthScore: 78,
    description: "Traditional comfort food with high energy.",
    ingredients: ["Rice porridge", "Chicken", "Egg", "Crackers"]
  }
]

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

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

  if (!mounted || isUserLoading || !user || !selectedDate) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg animate-pulse">NutriPal is syncing...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2300
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 1080)
  const burned = dailyLog?.caloriesBurned || 450
  const water = dailyLog?.waterIntake || 1.7
  
  const proteinTarget = profile?.proteinTarget || 31
  const carbsTarget = profile?.carbsTarget || 42
  const fatTarget = profile?.fatTarget || 38

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

  // Show 6 days before and the selected date at the far right
  const timelineDays = eachDayOfInterval({
    start: subDays(selectedDate, 6),
    end: selectedDate,
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Welcome Header */}
      <section className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground font-medium">Welcome back! Here is your daily wellness report:</p>
      </section>

      {/* Dynamic Timeline - TOP View - Today/Selected at far right */}
      <section className="w-full">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-border flex items-center justify-between">
           {timelineDays.map((day, i) => {
             const isSelected = isSameDay(day, selectedDate)
             return (
               <button 
                 key={i}
                 onClick={() => setSelectedDate(day)}
                 className={cn(
                   "flex flex-col items-center justify-center flex-1 py-4 rounded-[1.5rem] transition-all duration-300",
                   isSelected ? "bg-primary text-primary-foreground shadow-lg scale-105" : "text-muted-foreground hover:bg-secondary/50"
                 )}
               >
                 <span className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{format(day, "eee")}</span>
                 <span className="text-xl font-black leading-none">{format(day, "d")}</span>
                 {isSameDay(day, startOfToday()) && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-3" />}
               </button>
             )
           })}
        </div>
      </section>

      {/* Header Summary */}
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

            {/* Macro Targets Section */}
            <div className="pt-6 border-t border-muted/50">
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">Daily Macro Goals</p>
               <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-red-500">Protein</span> <span>{proteinTarget}%</span></div>
                    <Progress value={proteinTarget} className="h-1 bg-red-50" indicatorClassName="bg-red-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-yellow-500">Carbs</span> <span>{carbsTarget}%</span></div>
                    <Progress value={carbsTarget} className="h-1 bg-yellow-50" indicatorClassName="bg-yellow-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-blue-500">Fat</span> <span>{fatTarget}%</span></div>
                    <Progress value={fatTarget} className="h-1 bg-blue-50" indicatorClassName="bg-blue-400" />
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

        <div className="grid grid-cols-1 gap-5">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-[2.5rem] border-none shadow-sm hover:shadow-xl transition-all overflow-hidden bg-white group cursor-pointer" onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
                <CardContent className="p-0">
                  <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-secondary/30 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Utensils className="text-primary w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-xl tracking-tight leading-tight">{meal.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{meal.time}</span>
                          <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-lg border-none">{meal.source}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1.5">
                          <p className="font-black text-3xl tracking-tighter leading-none">+{meal.calories}</p>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">kcal</span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-2 pr-1">
                          <div className="flex flex-col items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[7px] font-black text-muted-foreground/40 uppercase">{meal.macros?.protein}g</span></div>
                          <div className="flex flex-col items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span className="text-[7px] font-black text-muted-foreground/40 uppercase">{meal.macros?.carbs}g</span></div>
                          <div className="flex flex-col items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-[7px] font-black text-muted-foreground/40 uppercase">{meal.macros?.fat}g</span></div>
                        </div>
                      </div>
                      {expandedMeal === meal.id ? <ChevronUp className="text-muted-foreground/30" /> : <ChevronDown className="text-muted-foreground/30" />}
                    </div>
                  </div>

                  {expandedMeal === meal.id && (
                    <div className="px-8 pb-8 pt-4 border-t border-muted/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Health Score</p>
                            <div className="flex items-center gap-2">
                               <span className="text-2xl font-black text-primary">{meal.healthScore || 75}/100</span>
                               <Progress value={meal.healthScore || 75} className="w-24 h-1.5" />
                            </div>
                         </div>
                         <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[8px] font-black tracking-widest px-3 py-1">Balanced Choice</Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">AI Insight</p>
                        <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">
                          "{meal.description}"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Ingredients</p>
                        <div className="flex flex-wrap gap-2">
                          {(meal.ingredients || []).map((ing, i) => (
                            <Badge key={i} variant="secondary" className="bg-muted/50 text-muted-foreground/70 font-bold text-[9px] border-none">{ing}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
