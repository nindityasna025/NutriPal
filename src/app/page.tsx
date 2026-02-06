
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  History
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { collection, doc } from "firebase/firestore"

// Mock data for initial empty state
const MOCK_MEALS = [
  { id: "m1", name: "Oatmeal with Almonds", calories: 350, time: "08:30 AM", source: "PLANNER" },
  { id: "m2", name: "Grilled Chicken Salad", calories: 520, time: "01:15 PM", source: "PHOTO" },
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

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 0)
  const burned = dailyLog?.caloriesBurned || 450 
  const water = dailyLog?.waterIntake || 1.8
  
  const status = consumed < calorieTarget - 200 ? "Deficit" : consumed > calorieTarget + 200 ? "Excess" : "Ideal"

  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700 pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">My Dashboard</h1>
          <p className="text-muted-foreground font-medium text-sm">Welcome back! Here is your daily wellness report.</p>
        </div>
        
        <section className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-border">
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => setSelectedDate(subDays(selectedDate!, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 font-bold text-xs px-2 min-w-[140px] justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, "EEEE, MMM d")}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => setSelectedDate(addDays(selectedDate!, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </section>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calories Card */}
        <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] shadow-none overflow-hidden relative group h-full">
          <div className="absolute top-4 right-4 opacity-5 group-hover:scale-110 transition-transform">
             <Flame className="w-24 h-24 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="w-3 h-3 text-primary" /> Calories Consumed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black">{consumed}</span>
              <span className="text-xs text-muted-foreground font-bold">/ {calorieTarget} kcal</span>
            </div>
            <div className="space-y-4">
              <Progress value={(consumed / calorieTarget) * 100} className="h-3 bg-primary/10" />
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-muted-foreground uppercase leading-tight">
                  Target<br/>Status
                </div>
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${
                  status === "Ideal" ? "bg-green-100 text-green-700" : 
                  status === "Deficit" ? "bg-blue-100 text-blue-700" : 
                  "bg-red-100 text-red-700"
                }`}>
                  {status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Burned Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Footprints className="w-3 h-3 text-orange-500" /> Active Calories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{burned}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">kcal</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase">Device Synced</span>
            </div>
          </CardContent>
        </Card>

        {/* Water Intake Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Droplets className="w-3 h-3 text-blue-500" /> Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{water}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">/ 2.5 L</span>
            </div>
            <Progress value={(water / 2.5) * 100} className="h-3 bg-blue-50 shadow-inner" />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black tracking-tighter">Daily Food Report</h2>
          </div>
          <Button variant="link" size="sm" className="text-primary font-black text-xs">View Full History</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-secondary/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Utensils className="text-primary w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg leading-tight">{meal.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{meal.time}</span>
                        <span className="text-[9px] px-2 py-0.5 bg-muted rounded-md font-black text-muted-foreground uppercase tracking-tighter">{meal.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-black text-2xl tracking-tighter leading-none">{meal.calories} <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">kcal</span></p>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
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
