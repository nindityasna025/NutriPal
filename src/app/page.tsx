
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
  ChevronUp
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { collection, doc, setDoc, increment } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

// Mock data updated with rich details
const MOCK_MEALS = [
  { 
    id: "m1", 
    name: "Avocado & Egg Toast", 
    calories: 320, 
    time: "02:30 PM", 
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
    time: "10:30 AM", 
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
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white z-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg animate-pulse">NutriPal is syncing...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2100
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 730)
  const burned = dailyLog?.caloriesBurned || 450 
  const water = dailyLog?.waterIntake || 1.8
  
  const proteinTarget = profile?.proteinTarget || 25
  const carbsTarget = profile?.carbsTarget || 45
  const fatTarget = profile?.fatTarget || 30

  const status = (consumed - calorieTarget) > 100 ? "Over Goal" : (consumed - calorieTarget) < -100 ? "Under Goal" : "Goal Met"

  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

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
    if (consumed > calorieTarget) return "You've reached your calorie goal. Focus on fiber-rich vegetables for the rest of the day.";
    return "You're doing great! Consistency is key to reaching your wellness goals.";
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10 animate-in fade-in duration-700 pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground font-medium text-sm">Welcome back! Here is your daily wellness report:</p>
        </div>
        
        <section className="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-border">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setSelectedDate(subDays(selectedDate!, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 font-bold text-sm px-4 min-w-[180px] justify-center text-foreground">
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, "EEEE, MMM d")}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setSelectedDate(addDays(selectedDate!, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </section>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="w-3 h-3 text-primary" /> Calories Consumed
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black">{consumed}</span>
              <span className="text-sm text-muted-foreground font-bold">/ {calorieTarget} kcal</span>
            </div>
            <div className="pt-2 space-y-3">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Macro Targets</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <div className="h-1 w-full bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${proteinTarget}%` }} />
                  </div>
                  <p className="text-[8px] font-black uppercase text-center">{proteinTarget}% P</p>
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-full bg-yellow-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${carbsTarget}%` }} />
                  </div>
                  <p className="text-[8px] font-black uppercase text-center">{carbsTarget}% C</p>
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: `${fatTarget}%` }} />
                  </div>
                  <p className="text-[8px] font-black uppercase text-center">{fatTarget}% F</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6 mt-6">
            <Progress value={(consumed / calorieTarget) * 100} className="h-2.5 bg-primary/10" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</span>
              <Badge className="bg-primary/20 text-primary-foreground border border-primary/20 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">{status}</Badge>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Footprints className="w-3 h-3 text-orange-500" /> Active Calories
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black">{burned}</span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Kcal</span>
            </div>
          </div>
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-full border border-green-100">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-wider">Device Synced</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white p-8 flex flex-col justify-between group">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Droplets className="w-3 h-3 text-blue-500" /> Water Intake
              </CardTitle>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => adjustWater(-0.1)}><Minus className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => adjustWater(0.1)}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black">{water.toFixed(1)}</span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ 2.5 L</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Progress value={(water / 2.5) * 100} className="h-2.5 bg-blue-50" />
            <p className="text-[9px] text-muted-foreground italic text-center font-medium opacity-60">Adjust by hovering or clicking</p>
          </div>
        </Card>
      </div>

      <section className="space-y-8 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black tracking-tight">Daily Food Report</h2>
          </div>
          <Button variant="link" size="sm" className="text-primary font-black text-xs uppercase tracking-widest">View Full History</Button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group cursor-pointer" onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
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
                         <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[8px] font-black tracking-widest px-3 py-1">Balance for Maintenance</Badge>
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
              <Button variant="link" className="mt-2 text-primary font-black text-lg">Start Logging Now</Button>
            </div>
          )}
        </div>
      </section>

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
    </div>
  )
}
