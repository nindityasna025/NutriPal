
"use client"

import { useState, useEffect, useMemo } from "react"
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
  Trophy,
  BarChart3,
  Info,
  ScanSearch
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const chartConfig = {
  protein: {
    label: "Protein",
    color: "hsl(var(--primary))",
  },
  carbs: {
    label: "Carbs",
    color: "hsl(var(--accent))",
  },
  fat: {
    label: "Fat",
    color: "#3b82f6",
  },
} satisfies ChartConfig

const MacroInfoContent = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
      <Sparkles className="w-4 h-4" /> Macro Balance Guide
    </div>
    <p className="text-xs font-medium leading-relaxed text-muted-foreground">
      Breaking down your intake into protein, carbs, and fats—the building blocks of energy and recovery.
    </p>
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-primary font-bold">Protein</span>
        <span>20-30g / 15-35% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-accent font-bold">Carbs</span>
        <span>20-30g / 40-50% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-blue-500 font-bold">Fat</span>
        <span>10-15g / 20-35% daily</span>
      </div>
    </div>
  </div>
)

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      data.push({
        date: format(d, "MMM d"),
        protein: 30 + Math.floor(Math.random() * 20),
        carbs: 60 + Math.floor(Math.random() * 40),
        fat: 20 + Math.floor(Math.random() * 15),
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

  const totals = useMemo(() => {
    if (!meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = totals.calories
  const burned = dailyLog?.caloriesBurned || 450
  const water = dailyLog?.waterIntake || 1.8
  const caloriePercent = Math.min(100, Math.round((consumed / calorieTarget) * 100))

  const totalMacros = totals.protein + totals.carbs + totals.fat;
  const proteinPercent = totalMacros > 0 ? (totals.protein / totalMacros) * 100 : 0;
  const carbsPercent = totalMacros > 0 ? (totals.carbs / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (totals.fat / totalMacros) * 100 : 0;

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  if (!mounted || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 space-y-12 pb-32">
      <header className="space-y-1 pt-safe md:pt-0">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Today</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      {/* Hero Calories Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Card className="md:col-span-8 border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Energy Balance</span>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-6xl font-black tracking-tighter">{consumed}</h2>
                  <span className="text-xl font-bold text-muted-foreground/40 tracking-tighter">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary/50 hover:bg-secondary">
                    <Info className="w-5 h-5 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-6 rounded-[2.5rem] shadow-premium-lg border-none glass">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-5">
              <div className="flex h-5 w-full rounded-full overflow-hidden bg-secondary">
                <div style={{ width: `${proteinPercent}%` }} className="bg-primary h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%` }} className="bg-accent h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%` }} className="bg-blue-500 h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest gap-2">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> {totals.protein}g Protein</div>
                <div className="flex items-center gap-2 justify-center"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> {totals.carbs}g Carbs</div>
                <div className="flex items-center gap-2 justify-end"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {totals.fat}g Fat</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Goal Completion</span>
                <span className="text-sm font-black text-primary">{caloriePercent}%</span>
              </div>
              <Progress value={caloriePercent} className="h-4 rounded-full bg-secondary" indicatorClassName="bg-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Sync Stats */}
        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-primary/5 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Burned Today</p>
              <p className="text-4xl font-black tracking-tighter">{burned} <span className="text-xs font-bold text-muted-foreground">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-blue-50 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
              <Droplets className="w-7 h-7 text-blue-500" />
            </div>
            <div className="space-y-4 w-full">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Hydration</p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-10 w-10 rounded-full border border-border/50 bg-secondary/30">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-4xl font-black tracking-tighter">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-premium">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Trends */}
      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Weekly Overview
        </h2>
        <Card className="border-none shadow-premium rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--border)/0.5)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 800 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-8" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={40} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Meals List */}
      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tight px-2 uppercase">Daily Activity</h2>
        <div className="space-y-5">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card 
                key={meal.id} 
                className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all cursor-pointer overflow-hidden group bg-white"
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              >
                <div className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-secondary rounded-3xl relative overflow-hidden flex-shrink-0 shadow-inner">
                      <Image 
                        src={`https://picsum.photos/seed/${meal.id}/400`} 
                        alt={meal.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-1000"
                        data-ai-hint="healthy meal"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl tracking-tight">{meal.name}</h3>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary tracking-tighter">+{meal.calories}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1.5">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-10 pb-10 pt-4 border-t border-muted/20 animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-3 gap-5 mb-10">
                      <div className="text-center p-6 bg-primary/5 rounded-[2rem]">
                        <span className="block text-[9px] font-black text-primary uppercase tracking-widest mb-1.5">Protein</span>
                        <span className="text-2xl font-black">{meal.macros?.protein}g</span>
                      </div>
                      <div className="text-center p-6 bg-accent/20 rounded-[2rem]">
                        <span className="block text-[9px] font-black text-accent-foreground uppercase tracking-widest mb-1.5">Carbs</span>
                        <span className="text-2xl font-black">{meal.macros?.carbs}g</span>
                      </div>
                      <div className="text-center p-6 bg-blue-50 rounded-[2rem]">
                        <span className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Fat</span>
                        <span className="text-2xl font-black">{meal.macros?.fat}g</span>
                      </div>
                    </div>
                    <div className="p-6 bg-secondary/50 rounded-[2.5rem] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nutritionist Score</p>
                          <p className="text-lg font-black text-primary uppercase">{meal.healthScore}/100 Health Score</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                         <div className="bg-white/80 p-2 rounded-xl"><ScanSearch className="w-5 h-5 text-primary" /></div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-28 bg-white/40 rounded-[3.5rem] border-2 border-dashed border-border flex flex-col items-center gap-8">
              <Utensils className="w-20 h-20 text-muted-foreground/10" />
              <div className="space-y-2">
                <p className="text-muted-foreground font-black text-2xl uppercase tracking-tighter">Nothing Logged</p>
                <p className="text-sm text-muted-foreground/60 font-bold uppercase tracking-widest">Plan your first meal to start tracking</p>
              </div>
              <Button onClick={() => router.push("/meal-planner")} className="rounded-full px-12 h-16 font-black uppercase tracking-[0.2em] shadow-premium-lg bg-primary text-primary-foreground hover:scale-105 transition-transform active:scale-95">
                MEAL PLANNER
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Action Hub - High-fidelity tactile controls */}
      <div className="grid grid-cols-2 gap-6 pt-6">
        <Button 
          onClick={() => router.push("/record")}
          className="h-44 rounded-[3.5rem] flex flex-col gap-4 bg-primary text-primary-foreground shadow-premium-lg hover:shadow-premium-lg transition-all active:scale-[0.97] group"
        >
          <div className="p-5 bg-white/10 rounded-3xl group-hover:scale-110 transition-transform">
            <Camera className="w-9 h-9" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.3em]">Snap Meal</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="h-44 rounded-[3.5rem] flex flex-col gap-4 bg-white text-primary border-none shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.97] group"
        >
          <div className="p-5 bg-accent/20 rounded-3xl group-hover:scale-110 transition-transform">
            <Sparkles className="w-9 h-9" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.3em]">Explore</span>
        </Button>
      </div>

      {/* AI Wellness Coach */}
      <Card className="rounded-[4rem] border-none shadow-premium-lg bg-primary text-primary-foreground p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
          <Sparkles className="w-56 h-56" />
        </div>
        <div className="relative z-10 space-y-8 max-w-2xl">
          <div className="flex items-center gap-4">
             <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-xl">
               <Sparkles className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-black uppercase tracking-tight">Wellness Coach</h2>
          </div>
          <p className="text-2xl font-bold leading-tight opacity-90 italic">
            "Your protein levels are optimal for recovery today. Try adding a bit more hydration after your next meal to boost digestion."
          </p>
        </div>
      </Card>
    </div>
  )
}
