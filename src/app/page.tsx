"use client"

import { useState } from "react"
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
  CheckCircle2
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { collection, doc } from "firebase/firestore"

export default function Dashboard() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [selectedDate, setSelectedDate] = useState(startOfToday())
  const dateId = format(selectedDate, "yyyy-MM-dd")

  // Refs
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const dailyLogRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, [user, firestore, dateId])
  const mealsColRef = useMemoFirebase(() => user ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

  const { data: profile } = useDoc(profileRef)
  const { data: dailyLog } = useDoc(dailyLogRef)
  const { data: meals } = useCollection(mealsColRef)

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || 0
  const burned = dailyLog?.caloriesBurned || 450 // Mocked from "connected device"
  const net = consumed - burned
  
  const status = net < calorieTarget - 200 ? "Deficit" : net > calorieTarget + 200 ? "Excess" : "Ideal"

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Date Filter */}
      <section className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-border">
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 font-bold text-sm">
          <CalendarDays className="w-4 h-4 text-primary" />
          {format(selectedDate, "EEEE, MMM d")}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </section>

      {/* Summary Rings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Calories Consumed</CardTitle>
            <Flame className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{consumed}</span>
              <span className="text-xs text-muted-foreground">/ {calorieTarget} kcal</span>
            </div>
            <Progress value={(consumed / calorieTarget) * 100} className="h-2 mt-3" />
            <div className="mt-4 p-2 bg-white/50 rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-bold">STATUS</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                status === "Ideal" ? "bg-green-100 text-green-700" : status === "Deficit" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
              }`}>
                {status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Active Burned</CardTitle>
            <Footprints className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{burned} <span className="text-xs font-normal">kcal</span></div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Synced with Wearable
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Hydration</CardTitle>
            <Droplets className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{dailyLog?.waterIntake || 0} <span className="text-xs font-normal">/ 2.5 L</span></div>
            <Progress value={((dailyLog?.waterIntake || 0) / 2.5) * 100} className="h-2 mt-3 bg-blue-50" />
          </CardContent>
        </Card>
      </div>

      {/* Food Report */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-headline font-bold">Daily Food Report</h2>
          <Button variant="ghost" size="sm" className="text-primary font-bold">View History</Button>
        </div>
        <div className="space-y-3">
          {meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card key={meal.id} className="rounded-2xl border-none shadow-sm overflow-hidden border-l-4 border-l-primary">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                      <Utensils className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{meal.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{meal.time} • {meal.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{meal.calories} kcal</p>
                    <div className="flex gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-border text-muted-foreground">
              <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No meals logged for this date.</p>
              <Button variant="link" className="mt-2 text-primary font-bold">Start Logging</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
