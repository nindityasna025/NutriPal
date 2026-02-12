
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
  ArrowRight
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { collection, doc, setDoc, increment } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

// Mock data for initial empty state
const MOCK_MEALS = [
  { id: "m1", name: "Avocado & Egg Toast", calories: 320, time: "02:30 PM", source: "PHOTO" },
  { id: "m2", name: "Avocado & Egg Toast", calories: 320, time: "10:30 AM", source: "PHOTO" },
]

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSelectedDate(startOfToday())
    setMounted(true)
  }, [])

  // Redirect to login if not authenticated after loading
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
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 640)
  const burned = dailyLog?.caloriesBurned || 450 
  const water = dailyLog?.waterIntake || 1.8
  
  // Dynamic Calorie Status Logic
  const getCalorieStatus = () => {
    const diff = consumed - calorieTarget;
    if (Math.abs(diff) <= 100) return "Tercapai";
    if (diff < 0) return "Kurang";
    return "Kelebihan";
  }
  const status = getCalorieStatus();

  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  // Simple logic for dynamic suggestion
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
        {/* Calories Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white h-full p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="w-3 h-3 text-primary" /> Calories Consumed
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black">{consumed}</span>
              <span className="text-sm text-muted-foreground font-bold">/ {calorieTarget} kcal</span>
            </div>
          </div>
          <div className="space-y-6 mt-6">
            <Progress value={(consumed / calorieTarget) * 100} className="h-2.5 bg-primary/10" />
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black text-muted-foreground uppercase leading-tight tracking-wider">
                Target<br/>Status
              </div>
              <span className="text-[10px] font-black px-5 py-2 rounded-full bg-primary/20 text-primary-foreground border border-primary/20">
                {status}
              </span>
            </div>
          </div>
        </Card>

        {/* Active Burned Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white h-full p-8 flex flex-col justify-between">
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

        {/* Water Intake Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white h-full p-8 flex flex-col justify-between group">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Droplets className="w-3 h-3 text-blue-500" /> Water Intake
              </CardTitle>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => adjustWater(-0.1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => adjustWater(0.1)}>
                  <Plus className="w-3 h-3" />
                </Button>
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
              <Card key={meal.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-8">
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
                  <div className="text-right flex flex-col items-end gap-3">
                    <p className="font-black text-3xl tracking-tight leading-none">
                      {meal.calories} <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Kcal</span>
                    </p>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    </div>
                  </div>
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

      {/* Smart Daily Insight Section */}
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
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
                  Smart Daily Insight
                  <Badge className="bg-primary/30 text-primary-foreground font-black text-[9px] uppercase tracking-widest px-3 py-1">AI POWERED</Badge>
                </h2>
                <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Based on your activity today</p>
              </div>
              <p className="text-lg font-medium text-foreground/80 leading-relaxed italic max-w-2xl">
                "{getSuggestion()}"
              </p>
              <div className="pt-2">
                <Button 
                  onClick={() => router.push("/meal-planner")}
                  className="bg-white text-primary hover:bg-white/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/5 border border-primary/10"
                >
                  OPTIMIZE MY SCHEDULE <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
