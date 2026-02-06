
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
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
  TrendingUp,
  History
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { collection, doc } from "firebase/firestore"

// Mock data for initial empty state
const MOCK_MEALS = [
  { id: "m1", name: "Oatmeal with Almonds", calories: 350, time: "08:30 AM", source: "Planner" },
  { id: "m2", name: "Grilled Chicken Salad", calories: 520, time: "01:15 PM", source: "Photo" },
]

export default function Dashboard() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSelectedDate(startOfToday())
    setMounted(true)
  }, [])

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

  if (!mounted || !selectedDate) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg animate-pulse">NutriPal is syncing...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 0)
  const burned = dailyLog?.caloriesBurned || 450 
  const net = consumed - burned
  
  const status = net < calorieTarget - 200 ? "Deficit" : net > calorieTarget + 200 ? "Excess" : "Ideal"

  // Use actual meals if they exist, otherwise show mock for demo
  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">My Dashboard</h1>
          <p className="text-muted-foreground font-medium">Welcome back! Here is your daily wellness report.</p>
        </div>
        
        <section className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-border">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 font-bold text-sm px-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, "EEEE, MMM d")}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </section>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 rounded-[2rem] shadow-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Flame className="w-24 h-24 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="w-3 h-3 text-primary" /> Calories Consumed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">{consumed}</span>
              <span className="text-xs text-muted-foreground font-bold">/ {calorieTarget} kcal</span>
            </div>
            <Progress value={(consumed / calorieTarget) * 100} className="h-3 mt-4 bg-primary/10" />
            <div className="mt-6 p-3 bg-white/80 rounded-2xl flex items-center justify-between shadow-sm">
              <span className="text-[10px] font-black text-muted-foreground uppercase">Target Status</span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                status === "Ideal" ? "bg-green-100 text-green-700 border border-green-200" : 
                status === "Deficit" ? "bg-blue-100 text-blue-700 border border-blue-200" : 
                "bg-red-100 text-red-700 border border-red-200"
              }`}>
                {status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl shadow-gray-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Footprints className="w-3 h-3 text-orange-500" /> Active Calories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-black">{burned} <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">kcal</span></div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase">Device Synced</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl shadow-gray-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Droplets className="w-3 h-3 text-blue-500" /> Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-black">{dailyLog?.waterIntake || 1.8} <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">/ 2.5 L</span></div>
            <Progress value={((dailyLog?.waterIntake || 1.8) / 2.5) * 100} className="h-3 bg-blue-50 shadow-inner" />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black tracking-tighter">Daily Food Report</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-primary font-black hover:bg-primary/5 rounded-xl">View Full History</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden border-l-8 border-l-primary bg-white group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-secondary/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Utensils className="text-primary w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg">{meal.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{meal.time}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-muted rounded-md font-bold text-muted-foreground uppercase">{meal.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl tracking-tighter">{meal.calories} <span className="text-xs font-bold text-muted-foreground">kcal</span></p>
                    <div className="flex gap-1.5 mt-2 justify-end">
                      <span className="w-2 h-2 rounded-full bg-red-400" title="Protein" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400" title="Carbs" />
                      <span className="w-2 h-2 rounded-full bg-blue-400" title="Fat" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-muted flex flex-col items-center justify-center">
              <Utensils className="w-20 h-20 mb-6 text-muted-foreground/20" />
              <p className="text-muted-foreground font-bold text-xl tracking-tight">No meals logged for this date.</p>
              <Button variant="link" className="mt-2 text-primary font-black text-lg">Start Logging Now</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
