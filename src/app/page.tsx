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
  Plus,
  Minus,
  Sparkles,
  Camera,
  Calendar,
  Trophy
} from "lucide-react"
import { format, startOfToday } from "date-fns"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isUserLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isUserLoading, mounted, router])

  const today = startOfToday()
  const dateId = format(today, "yyyy-MM-dd")

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
  const { data: meals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  if (!mounted || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-sm uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals?.reduce((sum, m) => sum + m.calories, 0) || 0)
  const burned = dailyLog?.caloriesBurned || 0
  const water = dailyLog?.waterIntake || 0
  const caloriePercent = Math.min(100, Math.round((consumed / calorieTarget) * 100))

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-24">
      {/* 1. Monitoring Header */}
      <section className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">Today</h1>
        <p className="text-muted-foreground font-medium">{format(today, "EEEE, MMMM do")}</p>
      </section>

      {/* 2. Primary CTA: Quick Action Hub */}
      <section className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => router.push("/record")}
          className="h-32 rounded-[2rem] flex flex-col gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-transform active:scale-95"
        >
          <Camera className="w-8 h-8" />
          <span className="font-black uppercase text-xs tracking-widest">Snap Meal</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/meal-planner")}
          className="h-32 rounded-[2rem] flex flex-col gap-2 bg-white border-2 border-primary/10 hover:bg-primary/5 text-primary transition-transform active:scale-95"
        >
          <Calendar className="w-8 h-8" />
          <span className="font-black uppercase text-xs tracking-widest">Plan Day</span>
        </Button>
      </section>

      {/* 3. Core Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-accent/30 overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Calories Consumed</p>
                <h2 className="text-5xl font-black tracking-tighter">{consumed}</h2>
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-1">Goal: {calorieTarget}</p>
            </div>
            <Progress value={caloriePercent} className="h-3 rounded-full bg-white" />
            
            <div className="pt-4 border-t border-primary/10">
              <div className="flex h-2 w-full rounded-full overflow-hidden bg-white">
                <div style={{ width: '25%' }} className="bg-red-500" />
                <div style={{ width: '45%' }} className="bg-yellow-500" />
                <div style={{ width: '30%' }} className="bg-blue-500" />
              </div>
              <div className="flex justify-between mt-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                <span>P: 25%</span>
                <span>C: 45%</span>
                <span>F: 30%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-red-50 rounded-2xl"><Flame className="w-5 h-5 text-red-500" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Burned</p>
            <h3 className="text-2xl font-black">{burned}</h3>
          </Card>
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-blue-50 rounded-2xl"><Droplets className="w-5 h-5 text-blue-500" /></div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-6 w-6"><Minus className="w-3 h-3" /></Button>
              <h3 className="text-xl font-black">{water}L</h3>
              <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-6 w-6"><Plus className="w-3 h-3 text-primary" /></Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Instant Feedback: Daily Log */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight uppercase px-2">Daily Log</h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card key={meal.id} className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center overflow-hidden relative">
                      {meal.imageUrl ? (
                        <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                      ) : (
                        <Utensils className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{meal.name}</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xl">+{meal.calories}</span>
                    <span className="text-[10px] font-bold text-muted-foreground ml-1">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-muted/50 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                      <span className="text-red-500">{meal.macros?.protein}g Protein</span>
                      <span className="text-yellow-600">{meal.macros?.carbs}g Carbs</span>
                      <span className="text-blue-500">{meal.macros?.fat}g Fat</span>
                      <div className="ml-auto flex items-center gap-1 text-primary">
                        <Trophy className="w-3 h-3" /> {meal.healthScore}/100
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground italic leading-relaxed">"{meal.description}"</p>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-muted flex flex-col items-center justify-center gap-4">
              <Utensils className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-muted-foreground font-bold">Your log is empty today.</p>
              <Button onClick={() => router.push("/record")} className="rounded-full px-8">Log My First Meal</Button>
            </div>
          )}
        </div>
      </section>

      {/* Smart Insight Banner */}
      <Card className="rounded-[2.5rem] border-none bg-primary text-primary-foreground p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform"><Sparkles className="w-32 h-32" /></div>
        <div className="relative z-10 space-y-3">
          <h2 className="text-xl font-black uppercase tracking-tight">AI Insight</h2>
          <p className="text-sm font-medium opacity-90 leading-relaxed italic">"You're maintaining a great balance today. Keep drinking water to support recovery from your active morning!"</p>
          <Button variant="secondary" className="rounded-full font-black text-[10px] uppercase tracking-widest mt-2">View Nutrition Tips</Button>
        </div>
      </Card>
    </div>
  )
}
