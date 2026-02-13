
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
  Trophy,
  BarChart3
} from "lucide-react"
import { format, startOfToday } from "date-fns"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const weeklyData = [
  { day: "Mon", protein: 450, carbs: 1200, fat: 600 },
  { day: "Tue", protein: 500, carbs: 1100, fat: 550 },
  { day: "Wed", protein: 480, carbs: 1300, fat: 700 },
  { day: "Thu", protein: 520, carbs: 1000, fat: 500 },
  { day: "Fri", protein: 490, carbs: 1150, fat: 580 },
  { day: "Sat", protein: 400, carbs: 1400, fat: 750 },
  { day: "Sun", protein: 420, carbs: 1250, fat: 680 },
]

const chartConfig = {
  protein: {
    label: "Protein",
    color: "hsl(0 84.2% 60.2%)", // text-red-500
  },
  carbs: {
    label: "Carbs",
    color: "hsl(47.9 95.8% 53.1%)", // text-yellow-500
  },
  fat: {
    label: "Fat",
    color: "hsl(221.2 83.2% 53.3%)", // text-blue-500
  },
} satisfies ChartConfig

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
        <h1 className="text-4xl font-black tracking-tight uppercase">Today</h1>
        <p className="text-muted-foreground font-semibold text-xs uppercase tracking-widest opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </section>

      {/* 2. Core Stats & Macro Balance (Moved Up) */}
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
            
            <div className="space-y-3">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-red-500">Protein: 25%</span>
                <span className="text-yellow-600">Carbs: 45%</span>
                <span className="text-blue-500">Fat: 30%</span>
              </div>
              {/* Unified 100% Macro Composition Line */}
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-white/50 border border-white/20">
                <div style={{ width: '25%' }} className="bg-red-500 h-full transition-all" />
                <div style={{ width: '45%' }} className="bg-yellow-500 h-full transition-all" />
                <div style={{ width: '30%' }} className="bg-blue-500 h-full transition-all" />
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Goal Progress</span>
                <span className="text-[10px] font-black text-primary">{caloriePercent}%</span>
              </div>
              <Progress value={caloriePercent} className="h-2 rounded-full bg-white" />
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

      {/* 3. Weekly Macro Overview Chart */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight uppercase px-2 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Weekly Overview
        </h2>
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }}
                  />
                  <ChartTooltip 
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }} 
                    content={<ChartTooltipContent hideLabel />} 
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar 
                    dataKey="protein" 
                    stackId="a" 
                    fill="var(--color-protein)" 
                    radius={[0, 0, 0, 0]} 
                    barSize={32}
                  />
                  <Bar 
                    dataKey="carbs" 
                    stackId="a" 
                    fill="var(--color-carbs)" 
                    radius={[0, 0, 0, 0]} 
                  />
                  <Bar 
                    dataKey="fat" 
                    stackId="a" 
                    fill="var(--color-fat)" 
                    radius={[6, 6, 0, 0]} 
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Daily Food Report */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight uppercase px-2">Daily Food Report</h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card key={meal.id} className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                <div 
                  className="p-8 flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                      {meal.imageUrl ? (
                        <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                      ) : (
                        <Image 
                          src={`https://picsum.photos/seed/${meal.id}/200`} 
                          alt={meal.name} 
                          fill 
                          className="object-cover"
                          data-ai-hint="food meal"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-xl leading-tight tracking-tight">{meal.name}</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em] opacity-70">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-2xl tracking-tighter">+{meal.calories}</span>
                    <span className="text-[10px] font-black text-muted-foreground ml-1 uppercase">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-8 pb-8 pt-2 border-t border-muted/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {/* Compact Macro & Benefit Row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-muted/20 pb-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{meal.macros?.protein}g Protein</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{meal.macros?.carbs}g Carbs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{meal.macros?.fat}g Fat</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-black uppercase text-primary tracking-widest">{meal.healthScore}/100 Benefit</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Nutrition Insight</p>
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">"{meal.description}"</p>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/50 flex flex-col items-center justify-center gap-6">
              <Utensils className="w-16 h-16 text-muted-foreground/10" />
              <div className="space-y-1">
                <p className="text-muted-foreground font-black text-lg uppercase tracking-tight">Your Log is Empty</p>
                <p className="text-muted-foreground/60 text-sm font-medium">Record your first meal to see today's breakdown.</p>
              </div>
              <Button onClick={() => router.push("/record")} className="rounded-full px-10 h-12 font-black uppercase text-xs tracking-widest shadow-lg">Log My First Meal</Button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Quick Action Hub (Moved Down) */}
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

      {/* 6. Smart Insight Banner */}
      <Card className="rounded-[3rem] border-none bg-primary text-primary-foreground p-10 relative overflow-hidden group shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
          <Sparkles className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Sparkles className="w-5 h-5" /></div>
             <h2 className="text-xl font-black uppercase tracking-tight">AI Wellness Insight</h2>
          </div>
          <p className="text-base font-medium opacity-90 leading-relaxed italic">
            "You're maintaining a great macro balance today. Keep drinking water to support recovery from your active morning and prepare for a healthy dinner!"
          </p>
          <Button variant="secondary" className="rounded-full font-black text-[10px] uppercase tracking-widest h-10 px-8 bg-white text-primary hover:bg-white/90">
            View Full Analysis
          </Button>
        </div>
      </Card>
    </div>
  )
}
