
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
  ScanSearch,
  AlertCircle,
  Bike
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
  protein: { label: "Protein", color: "hsl(var(--primary))" },
  carbs: { label: "Carbs", color: "hsl(var(--accent))" },
  fat: { label: "Fat", color: "#3b82f6" },
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

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const dailyLogRef = useMemoFirebase(() => (user && dateId) ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, [user, firestore, dateId])
  const mealsColRef = useMemoFirebase(() => (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

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
  
  const actualPercent = Math.round((consumed / calorieTarget) * 100)
  const caloriePercentForProgress = Math.min(100, actualPercent)
  const isOverLimit = consumed > calorieTarget

  const totalMacros = totals.protein + totals.carbs + totals.fat;
  const proteinPercent = totalMacros > 0 ? (totals.protein / totalMacros) * 100 : 0;
  const carbsPercent = totalMacros > 0 ? (totals.carbs / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (totals.fat / totalMacros) * 100 : 0;

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { waterIntake: Number(newWater.toFixed(1)), date: dateId }, { merge: true });
  }

  if (!mounted || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen">
      <header className="space-y-1 pt-safe md:pt-8 text-center lg:text-left animate-in fade-in duration-700">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Today</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      {/* Hero Glance Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Card className="md:col-span-8 border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
          <CardContent className="p-8 sm:p-12 space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Daily Energy Balance</span>
                <div className="flex items-baseline gap-3">
                  <h2 className={cn("text-6xl sm:text-7xl font-black tracking-tighter transition-colors", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground/40 tracking-tighter">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 bg-secondary/50 hover:bg-secondary">
                    <Info className="w-6 h-6 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-6 rounded-[2.5rem] shadow-premium-lg border-none glass">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-6">
              <div className="flex h-6 w-full rounded-full overflow-hidden bg-secondary">
                <div style={{ width: `${proteinPercent}%` }} className="bg-primary h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%` }} className="bg-accent h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%` }} className="bg-blue-500 h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary shrink-0" /> 
                  {Math.round(proteinPercent)}% <span className="hidden sm:inline">Protein</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 rounded-full bg-accent shrink-0" /> 
                  {Math.round(carbsPercent)}% <span className="hidden sm:inline">Carbs</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> 
                  {Math.round(fatPercent)}% <span className="hidden sm:inline">Fat</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Goal Progress</span>
                <div className="flex items-center gap-2">
                  {isOverLimit && <AlertCircle className="w-4 h-4 text-destructive animate-pulse" />}
                  <span className={cn("text-sm font-black", isOverLimit ? "text-destructive" : "text-primary")}>
                    {actualPercent}% {isOverLimit && "OVER TARGET"}
                  </span>
                </div>
              </div>
              <Progress 
                value={caloriePercentForProgress} 
                className="h-5 rounded-full bg-secondary" 
                indicatorClassName={isOverLimit ? "bg-destructive" : "bg-primary"} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Sync Status Cards */}
        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-5 bg-primary/10 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Burned Today</p>
              <p className="text-4xl font-black tracking-tighter">{burned} <span className="text-xs font-bold text-muted-foreground">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-5 bg-blue-50 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
              <Droplets className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-5 w-full">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Water Tracker</p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-12 w-12 rounded-full border border-border bg-secondary/30">
                  <Minus className="w-5 h-5" />
                </Button>
                <span className="text-4xl font-black tracking-tighter">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-premium">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Trends */}
      <section className="space-y-8">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 text-center lg:text-left justify-center lg:justify-start">
          <BarChart3 className="w-6 h-6 text-primary" />
          Weekly Macro Trends
        </h2>
        <Card className="border-none shadow-premium rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-8 sm:p-12">
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--border)/0.5)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 800 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-8" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={32} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Activity Timeline */}
      <section className="space-y-8">
        <h2 className="text-xl font-black tracking-tight px-2 uppercase text-center lg:text-left">Daily Activity</h2>
        <div className="space-y-5">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card 
                key={meal.id} 
                className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all cursor-pointer overflow-hidden group bg-white"
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              >
                <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-8 w-full sm:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-secondary rounded-[2rem] relative overflow-hidden flex-shrink-0 shadow-inner">
                      <Image 
                        src={`https://picsum.photos/seed/${meal.id}/400`} 
                        alt={meal.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-1000"
                        data-ai-hint="healthy meal"
                      />
                      {meal.source !== 'planner' && (
                        <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg shadow-sm">
                          <Bike className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-2xl sm:text-3xl tracking-tight leading-tight">{meal.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">+{meal.calories}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-8 sm:px-12 pb-12 pt-4 border-t border-muted/10 animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-10">
                      <div className="text-center p-6 bg-primary/5 rounded-[2.5rem]">
                        <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Protein</span>
                        <span className="text-2xl font-black">{meal.macros?.protein}g</span>
                      </div>
                      <div className="text-center p-6 bg-accent/20 rounded-[2.5rem]">
                        <span className="block text-[10px] font-black text-accent-foreground uppercase tracking-widest mb-2">Carbs</span>
                        <span className="text-2xl font-black">{meal.macros?.carbs}g</span>
                      </div>
                      <div className="text-center p-6 bg-blue-50 rounded-[2.5rem]">
                        <span className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Fat</span>
                        <span className="text-2xl font-black">{meal.macros?.fat}g</span>
                      </div>
                    </div>
                    <div className="p-8 bg-secondary/50 rounded-[3rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm shrink-0">
                          <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">NutriPal Score</p>
                          <p className="text-xl font-black text-primary uppercase">{meal.healthScore}/100 Perfect Harmony</p>
                        </div>
                      </div>
                      <Button variant="outline" className="rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary/10">
                         <ScanSearch className="w-5 h-5 mr-2" /> Detailed Analysis
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-28 bg-white/40 rounded-[4rem] border-2 border-dashed border-border flex flex-col items-center gap-10 px-8">
              <Utensils className="w-20 h-20 text-muted-foreground/10" />
              <div className="space-y-3">
                <p className="text-muted-foreground font-black text-3xl uppercase tracking-tighter">Your Log is Empty</p>
                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  Start your transformation by tracking your first meal or generating an AI plan.
                </p>
              </div>
              <Button onClick={() => router.push("/meal-planner")} className="rounded-full px-16 h-18 font-black uppercase tracking-[0.2em] shadow-premium-lg bg-primary text-primary-foreground hover:scale-105 transition-all text-sm">
                GO TO PLANNER
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Action Hub - Priority Interactive Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8">
        <Button 
          onClick={() => router.push("/record")}
          className="h-44 sm:h-56 rounded-[3.5rem] sm:rounded-[4.5rem] flex flex-col gap-5 bg-primary text-primary-foreground shadow-premium-lg hover:shadow-premium-lg transition-all active:scale-[0.97] group"
        >
          <div className="p-6 bg-white/10 rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
            <Camera className="w-10 h-10" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.4em]">Snap Meal Analysis</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="h-44 sm:h-56 rounded-[3.5rem] sm:rounded-[4.5rem] flex flex-col gap-5 bg-white text-primary border-none shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.97] group"
        >
          <div className="p-6 bg-accent/20 rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
            <Sparkles className="w-10 h-10" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.4em]">Explore Healthy Picks</span>
        </Button>
      </div>

      {/* Wellness Insight */}
      <Card className="rounded-[4rem] border-none shadow-premium-lg bg-primary text-primary-foreground p-10 sm:p-16 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-10 group-hover:rotate-12 transition-transform duration-1000 hidden lg:block">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-8 max-w-2xl text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center gap-6">
             <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-xl shrink-0 shadow-inner">
               <Sparkles className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-black uppercase tracking-tight">AI Health Whisper</h2>
          </div>
          <p className="text-2xl sm:text-3xl font-bold leading-tight opacity-90 italic">
            "Your macro balance is perfectly aligned with your recovery goals. Increase water intake by 0.5L this afternoon to maximize metabolic efficiency."
          </p>
        </div>
      </Card>
    </div>
  )
}
