
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Flame, 
  Droplets, 
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
import { format, startOfToday, subDays } from "date-fns"
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

const chartConfig = {
  protein: {
    label: "Protein",
    color: "hsl(0 84.2% 60.2%)",
  },
  carbs: {
    label: "Carbs",
    color: "hsl(47.9 95.8% 53.1%)",
  },
  fat: {
    label: "Fat",
    color: "hsl(221.2 83.2% 53.3%)",
  },
} satisfies ChartConfig

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    
    // Generate dynamic last 7 days data with actual dates
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      data.push({
        date: format(d, "MMM d"),
        protein: 400 + Math.floor(Math.random() * 200),
        carbs: 1000 + Math.floor(Math.random() * 400),
        fat: 500 + Math.floor(Math.random() * 200),
      })
    }
    setWeeklyData(data)
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
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Initializing Ecosystem</p>
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
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 pb-32 animate-in fade-in duration-1000">
      {/* 1. Monitoring Header */}
      <section className="space-y-1">
        <h1 className="text-5xl font-black tracking-tighter uppercase text-foreground">Today</h1>
        <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] opacity-50">
          {format(today, "EEEE, MMMM do")}
        </p>
      </section>

      {/* 2. Core Stats & Macro Balance */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden group">
          <CardContent className="p-10 space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Calories Consumed</p>
                <h2 className="text-6xl font-black tracking-tighter tabular-nums">{consumed}</h2>
              </div>
              <div className="text-right pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Target</p>
                <p className="text-lg font-black">{calorieTarget}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-red-500">Protein: 25%</span>
                <span className="text-yellow-600">Carbs: 45%</span>
                <span className="text-blue-500">Fat: 30%</span>
              </div>
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-secondary/50 border border-muted/20">
                <div style={{ width: '25%' }} className="bg-red-500 h-full transition-all duration-700" />
                <div style={{ width: '45%' }} className="bg-yellow-500 h-full transition-all duration-700 delay-100" />
                <div style={{ width: '30%' }} className="bg-blue-500 h-full transition-all duration-700 delay-200" />
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Goal Progress</span>
                <span className="text-xs font-black text-primary">{caloriePercent}%</span>
              </div>
              <Progress value={caloriePercent} className="h-2.5 rounded-full bg-secondary" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 flex flex-col items-center justify-center text-center gap-4 group hover:scale-[1.02] transition-transform">
            <div className="p-4 bg-red-50 rounded-3xl group-hover:bg-red-100 transition-colors">
              <Flame className="w-6 h-6 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Calories Burned</p>
              <h3 className="text-3xl font-black tabular-nums">{burned}</h3>
            </div>
          </Card>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 flex flex-col items-center justify-center text-center gap-4 group hover:scale-[1.02] transition-transform">
            <div className="p-4 bg-blue-50 rounded-3xl group-hover:bg-blue-100 transition-colors">
              <Droplets className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Water Intake</p>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-8 w-8 rounded-full border border-muted hover:bg-secondary">
                  <Minus className="w-3 h-3" />
                </Button>
                <h3 className="text-2xl font-black tabular-nums">{water}L</h3>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10">
                  <Plus className="w-3 h-3 text-primary" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. Weekly Macro Overview Chart */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight uppercase px-2 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          Weekly Overview
        </h2>
        <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart 
                  data={weeklyData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted)/0.5)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 800 }}
                    tickMargin={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }}
                    tickMargin={10}
                  />
                  <ChartTooltip 
                    cursor={{ fill: "hsl(var(--muted)/0.1)" }} 
                    content={<ChartTooltipContent hideLabel />} 
                  />
                  <ChartLegend content={<ChartLegendContent />} className="pt-10" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" radius={[0, 0, 0, 0]} barSize={Math.min(36, 100 / (weeklyData.length || 1))} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Daily Food Report */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight uppercase px-2">Daily Food Report</h2>
        <div className="space-y-5">
          {isLoadingMeals ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card key={meal.id} className="rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white transition-all hover:shadow-xl">
                <div 
                  className="p-8 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-secondary rounded-[2rem] flex items-center justify-center overflow-hidden relative shadow-inner">
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
                    <div className="space-y-1.5">
                      <h3 className="font-black text-2xl leading-tight tracking-tight">{meal.name}</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em]">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-3xl tracking-tighter text-foreground">+{meal.calories}</span>
                    <span className="text-[10px] font-black text-muted-foreground ml-1.5 uppercase">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-10 pb-10 pt-4 border-t border-muted/10 space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-muted/10 pb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{meal.macros?.protein}g Protein</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/20" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{meal.macros?.carbs}g Carbs</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/20" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{meal.macros?.fat}g Fat</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2.5 px-5 py-2 bg-primary/10 rounded-full border border-primary/10">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-black uppercase text-primary tracking-[0.2em]">{meal.healthScore}/100 Health Score</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">Nutritional Analysis</p>
                      <p className="text-base font-medium text-foreground/70 leading-relaxed italic pr-8">
                        "{meal.description}"
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center gap-8">
              <div className="p-6 bg-secondary/30 rounded-[2.5rem]">
                <Utensils className="w-16 h-16 text-muted-foreground/20" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground font-black text-xl uppercase tracking-tight">Your Log is Empty</p>
                <p className="text-muted-foreground/60 text-sm font-medium px-10">Record your first meal to start monitoring your daily balance.</p>
              </div>
              <Button onClick={() => router.push("/record")} className="rounded-full px-12 h-14 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-transform">
                Log My First Meal
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Quick Action Hub */}
      <section className="grid grid-cols-2 gap-6">
        <Button 
          onClick={() => router.push("/record")}
          className="h-40 rounded-[2.5rem] flex flex-col gap-3 bg-primary text-primary-foreground hover:bg-primary/95 shadow-2xl shadow-primary/20 transition-all active:scale-95 group"
        >
          <div className="p-3 bg-white/20 rounded-2xl group-hover:rotate-6 transition-transform">
            <Camera className="w-8 h-8" />
          </div>
          <span className="font-black uppercase text-xs tracking-[0.2em]">Snap Meal</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/meal-planner")}
          className="h-40 rounded-[2.5rem] flex flex-col gap-3 bg-white border-2 border-primary/5 hover:bg-secondary/50 text-primary shadow-xl transition-all active:scale-95 group"
        >
          <div className="p-3 bg-primary/5 rounded-2xl group-hover:-rotate-6 transition-transform">
            <Calendar className="w-8 h-8" />
          </div>
          <span className="font-black uppercase text-xs tracking-[0.2em]">Plan Day</span>
        </Button>
      </section>

      {/* 6. Smart Insight Banner */}
      <Card className="rounded-[3rem] border-none bg-primary text-primary-foreground p-12 relative overflow-hidden group shadow-2xl shadow-primary/30">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="flex items-center gap-4">
             <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-lg">
               <Sparkles className="w-6 h-6" />
             </div>
             <h2 className="text-2xl font-black uppercase tracking-tight">AI Wellness Insight</h2>
          </div>
          <p className="text-lg font-medium opacity-90 leading-relaxed italic pr-6">
            "You're maintaining a great macro balance today. Keep drinking water to support recovery from your active morning and prepare for a healthy dinner!"
          </p>
          <Button variant="secondary" className="rounded-full font-black text-[10px] uppercase tracking-[0.2em] h-12 px-10 bg-white text-primary hover:bg-white/95 shadow-lg active:scale-95 transition-transform">
            View Full Analysis
          </Button>
        </div>
      </Card>
    </div>
  )
}
