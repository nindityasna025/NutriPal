
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
  Footprints, 
  Droplets, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Utensils,
  CheckCircle2,
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
  Leaf
} from "lucide-react"
import { format, addDays, subDays, startOfToday, eachDayOfInterval, isSameDay } from "date-fns"
import { collection, doc, setDoc, increment } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

// Mock data updated with rich details
const MOCK_MEALS = [
  { 
    id: "m1", 
    name: "Avocado & Egg Toast", 
    calories: 320, 
    time: "08:30 AM", 
    source: "PHOTO",
    macros: { protein: 12, carbs: 28, fat: 18 },
    healthScore: 85,
    description: "This meal offers a perfect balance of healthy fats from avocado and high-quality protein from eggs. Excellent for brain health and sustained energy.",
    ingredients: ["Sourdough bread", "Avocado", "Poached egg", "Red pepper flakes", "Lemon juice"]
  },
  { 
    id: "m2", 
    name: "Quinoa Salad Bowl", 
    calories: 410, 
    time: "01:30 PM", 
    source: "PLANNER",
    macros: { protein: 15, carbs: 45, fat: 12 },
    healthScore: 92,
    description: "Quinoa provides all nine essential amino acids. The fiber content keeps you full and helps with digestion.",
    ingredients: ["Quinoa", "Cucumber", "Cherry tomatoes", "Chickpeas", "Olive oil dressing"]
  },
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

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 0)
  const burned = dailyLog?.caloriesBurned || 0
  const water = dailyLog?.waterIntake || 0
  
  const proteinTarget = profile?.proteinTarget || 25
  const carbsTarget = profile?.carbsTarget || 45
  const fatTarget = profile?.fatTarget || 30

  const caloriePercent = Math.min(100, Math.round((consumed / calorieTarget) * 100))
  
  const getCalorieStatus = () => {
    if (consumed === 0) return { label: "Not Started", color: "text-muted-foreground" };
    if (consumed >= calorieTarget - 100 && consumed <= calorieTarget + 100) return { label: "Goal Met", color: "text-green-600" };
    if (consumed > calorieTarget + 100) return { label: "Over Goal", color: "text-red-500" };
    return { label: "Under Goal", color: "text-primary" };
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

  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

  // Generate week view timeline
  const timelineDays = eachDayOfInterval({
    start: subDays(startOfToday(), 3),
    end: addDays(startOfToday(), 3),
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700 pb-40">
      {/* Header Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Calorie Tracker</CardTitle>
              <Badge variant="outline" className={cn("font-black text-[10px] uppercase border-none px-0", calorieStatus.color)}>
                {calorieStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-6xl font-black tracking-tighter">{consumed}</h1>
              <span className="text-lg font-bold text-muted-foreground">/ {calorieTarget} kcal</span>
            </div>
            <div className="space-y-2">
              <Progress value={caloriePercent} className="h-3 rounded-full" />
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>{caloriePercent}% Goal Reached</span>
                <span>{Math.max(0, calorieTarget - consumed)} kcal left</span>
              </div>
            </div>

            {/* Macro Targets Section */}
            <div className="pt-4 border-t border-muted/50">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Daily Macro Goals</p>
               <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-red-500">Protein</span> <span>{proteinTarget}%</span></div>
                    <Progress value={proteinTarget} className="h-1 bg-red-100" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-yellow-500">Carbs</span> <span>{carbsTarget}%</span></div>
                    <Progress value={carbsTarget} className="h-1 bg-yellow-100" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-blue-500">Fat</span> <span>{fatTarget}%</span></div>
                    <Progress value={fatTarget} className="h-1 bg-blue-100" />
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card className="border-none shadow-xl bg-white rounded-[2rem]">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2 h-full">
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <Flame className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Burned Today</p>
              <h3 className="text-3xl font-black tracking-tight">{burned} <span className="text-sm font-bold">kcal</span></h3>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white rounded-[2rem]">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-8 w-8 rounded-full border border-primary/20"><Minus className="w-4 h-4" /></Button>
                 <div className="space-y-1">
                    <div className="p-2 bg-blue-50 rounded-xl mx-auto w-fit"><Droplets className="w-5 h-5 text-blue-500" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Water</p>
                    <h3 className="text-2xl font-black tracking-tight">{water} <span className="text-sm font-bold text-muted-foreground">L</span></h3>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5"><Plus className="w-4 h-4 text-primary" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Daily Food Report Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black tracking-tight">Daily Food Report</h2>
          </div>
          <Button variant="link" size="sm" className="text-primary font-black text-xs uppercase tracking-widest">View All</Button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group cursor-pointer" onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
                <CardContent className="p-0">
                  <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-secondary/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Utensils className="text-primary w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-xl tracking-tight">{meal.name}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{meal.time}</span>
                          <span className="text-[9px] px-2.5 py-1 bg-muted rounded-lg font-black text-muted-foreground uppercase tracking-wider">{meal.source}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-2">
                          <p className="font-black text-3xl tracking-tight leading-none">+{meal.calories}</p>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">kcal</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[9px] font-black text-red-400">{meal.macros?.protein}g P</span>
                          <span className="text-[9px] font-black text-yellow-500">{meal.macros?.carbs}g C</span>
                          <span className="text-[9px] font-black text-blue-400">{meal.macros?.fat}g F</span>
                        </div>
                      </div>
                      {expandedMeal === meal.id ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                    </div>
                  </div>

                  {expandedMeal === meal.id && (
                    <div className="px-8 pb-8 pt-4 border-t border-muted/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Health Benefit</p>
                            <div className="flex items-center gap-2">
                               <span className="text-2xl font-black text-primary">{meal.healthScore || 75}/100</span>
                               <Progress value={meal.healthScore || 75} className="w-24 h-1.5" />
                            </div>
                         </div>
                         <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[8px] font-black tracking-widest px-3 py-1">Balanced Choice</Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Insight</p>
                        <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">
                          "{meal.description || "This meal provides a good nutritional balance. Adding more leafy greens could further enhance its health score."}"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Ingredients</p>
                        <div className="flex flex-wrap gap-2">
                          {(meal.ingredients || ["Stir fried noodles", "Egg", "Vegetables"]).map((ing, i) => (
                            <Badge key={i} variant="secondary" className="bg-muted/50 text-muted-foreground font-bold text-[10px]">{ing}</Badge>
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
              <Utensils className="w-24 h-24 mb-6 text-muted-foreground/20" />
              <p className="text-muted-foreground font-bold text-xl tracking-tight">No meals logged for this date.</p>
              <Button onClick={() => router.push("/record")} variant="link" className="mt-2 text-primary font-black text-lg">Start Logging Now</Button>
            </div>
          )}
        </div>
      </section>

      {/* Smart Insight Card */}
      <section className="pt-6">
        <Card className="rounded-[2.5rem] border-none bg-gradient-to-br from-primary/20 to-accent/20 shadow-xl shadow-primary/5 overflow-hidden group">
          <CardContent className="p-10 flex flex-col md:flex-row items-center gap-10 relative">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-40 h-40 text-primary" />
            </div>
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shrink-0">
              <Lightbulb className="w-12 h-12 text-primary fill-primary/10" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left z-10">
              <h2 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
                Smart Daily Insight <Badge className="bg-primary/30 text-primary-foreground font-black text-[9px] uppercase tracking-widest">AI POWERED</Badge>
              </h2>
              <p className="text-lg font-medium text-foreground/80 leading-relaxed italic max-w-2xl">"{getSuggestion()}"</p>
              <Button onClick={() => router.push("/meal-planner")} className="bg-white text-primary hover:bg-white/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg border border-primary/10">
                OPTIMIZE MY SCHEDULE <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dynamic Timeline - Week View Date Selector */}
      <div className="fixed bottom-24 left-0 right-0 px-4 md:px-0 md:absolute md:bottom-8 w-full z-50">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md border border-border rounded-[2rem] p-3 shadow-2xl flex items-center justify-between">
           {timelineDays.map((day, i) => {
             const isSelected = isSameDay(day, selectedDate)
             return (
               <button 
                 key={i}
                 onClick={() => setSelectedDate(day)}
                 className={cn(
                   "flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all duration-300",
                   isSelected ? "bg-primary text-primary-foreground shadow-lg scale-110" : "text-muted-foreground hover:bg-secondary"
                 )}
               >
                 <span className="text-[10px] font-black uppercase tracking-tighter mb-1">{format(day, "eee")}</span>
                 <span className="text-lg font-black">{format(day, "d")}</span>
                 {isSameDay(day, startOfToday()) && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
               </button>
             )
           })}
        </div>
      </div>
    </div>
  )
}
