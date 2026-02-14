
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Flame, 
  Droplets, 
  Utensils,
  Loader2,
  Plus,
  Minus,
  Sparkles,
  Camera,
  BarChart3,
  Info
} from "lucide-react"
import { format, startOfToday, subDays } from "date-fns"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
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
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
      <Sparkles className="w-3.5 h-3.5" /> Macro Balance Guide
    </div>
    <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
      Breaking down your intake into protein, carbs, and fats—the building blocks of energy and recovery.
    </p>
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-primary font-bold">Protein</span>
        <span>15-35% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-accent font-bold">Carbs</span>
        <span>40-50% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-blue-500 font-bold">Fat</span>
        <span>20-35% daily</span>
      </div>
    </div>
  </div>
)

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
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
  const { data: meals } = useCollection(mealsColRef)

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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen">
      <header className="space-y-1 pt-safe md:pt-4 text-center lg:text-left animate-in fade-in duration-700">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Today</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-8 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-6 sm:p-10 space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Energy Balance</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={cn("text-4xl font-black tracking-tighter transition-colors", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-lg font-bold text-muted-foreground/40 tracking-tighter">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary/50 hover:bg-secondary">
                    <Info className="w-5 h-5 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-5 rounded-[2rem] shadow-premium-lg border-none glass">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4">
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-secondary">
                <div style={{ width: `${proteinPercent}%` }} className="bg-primary h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%` }} className="bg-accent h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%` }} className="bg-blue-500 h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" /> 
                  {Math.round(proteinPercent)}% <span className="hidden sm:inline">Protein</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" /> 
                  {Math.round(carbsPercent)}% <span className="hidden sm:inline">Carbs</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> 
                  {Math.round(fatPercent)}% <span className="hidden sm:inline">Fat</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Goal Progress</span>
                <span className={cn("text-xs font-black", isOverLimit ? "text-destructive" : "text-primary")}>
                  {actualPercent}% {isOverLimit && "OVER"}
                </span>
              </div>
              <Progress 
                value={caloriePercentForProgress} 
                className="h-3 rounded-full bg-secondary" 
                indicatorClassName={isOverLimit ? "bg-destructive" : "bg-primary"} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-4 grid grid-cols-1 gap-4">
          <Card className="border-none shadow-premium rounded-[2rem] p-6 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-primary/10 rounded-2xl mb-3 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Burned</p>
              <p className="text-3xl font-black tracking-tighter">{burned} <span className="text-[10px] font-bold text-muted-foreground">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[2rem] p-6 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-blue-50 rounded-2xl mb-3 group-hover:scale-105 transition-transform">
              <Droplets className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-4 w-full">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Hydration</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-10 w-10 rounded-full border border-border bg-secondary/30">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-black tracking-tighter">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-premium">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2 px-1 uppercase text-left">
          <BarChart3 className="w-5 h-5 text-primary" />
          Weekly Macro Trends
        </h2>
        <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-10">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--border)/0.5)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 600 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-6" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={24} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2 px-1 uppercase text-left">
          <Utensils className="w-5 h-5 text-primary" />
          Daily Food Record
        </h2>
        <div className="space-y-4">
          {meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card key={meal.id} className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden hover:shadow-premium-lg transition-all">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Utensils className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black uppercase truncate">{meal.name}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{meal.time} • {meal.calories} kcal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="rounded-lg text-[8px] font-black uppercase px-2 py-0.5 border-primary/20 text-primary">
                      {meal.source === 'planner' ? 'Cooked' : (meal.source || 'Logged')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-muted/20 flex flex-col items-center justify-center">
              <p className="text-muted-foreground font-black text-sm uppercase tracking-tight">No meals logged today</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
        <Button 
          onClick={() => router.push("/record")}
          className="h-32 sm:h-40 rounded-[2.5rem] flex flex-col gap-3 bg-primary text-primary-foreground shadow-premium-lg hover:shadow-premium-lg transition-all active:scale-[0.98] group"
        >
          <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-105 transition-transform shadow-inner">
            <Camera className="w-7 h-7" />
          </div>
          <span className="font-black text-xs uppercase tracking-[0.3em]">Snap Meal Analysis</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="h-32 sm:h-40 rounded-[2.5rem] flex flex-col gap-3 bg-white text-primary border-none shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.98] group"
        >
          <div className="p-4 bg-accent/20 rounded-2xl group-hover:scale-105 transition-transform shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <span className="font-black text-xs uppercase tracking-[0.3em]">Explore Healthy Picks</span>
        </Button>
      </div>

      <Card className="rounded-[3rem] border-none shadow-premium-lg bg-primary text-primary-foreground p-8 sm:p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-6 transition-transform duration-1000 hidden lg:block">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-6 max-w-2xl text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center gap-4">
             <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-xl shrink-0 shadow-inner">
               <Sparkles className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-black uppercase tracking-tight">AI Health Whisper</h2>
          </div>
          <p className="text-xl sm:text-2xl font-bold leading-tight opacity-90 italic">
            "Your macro balance is perfectly aligned with your recovery goals. Increase water intake by 0.5L this afternoon to maximize metabolic efficiency."
          </p>
        </div>
      </Card>
    </div>
  )
}
