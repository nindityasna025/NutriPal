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
  Info,
  ChevronDown,
  Activity,
  Leaf
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Standardized Macro Colors - Sharp Palette
const MACRO_COLORS = {
  protein: "#BFDCCB", // Pastel Green
  carbs: "#F3F8C6",   // Light Amber
  fat: "#DCE96A",     // Soft Lime
}

const chartConfig = {
  protein: { label: "Protein", color: MACRO_COLORS.protein },
  carbs: { label: "Carbs", color: MACRO_COLORS.carbs },
  fat: { label: "Fat", color: MACRO_COLORS.fat },
} satisfies ChartConfig

const MacroInfoContent = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest text-left">
      <Sparkles className="w-3.5 h-3.5" /> Macro Balance Guide
    </div>
    <p className="text-[12px] font-medium leading-relaxed text-muted-foreground text-left">
      Your daily energy distribution. We prioritize protein for recovery and carbs for activity.
    </p>
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase">
        <span style={{ color: "#7FB79A" }}>Protein</span>
        <span className="text-muted-foreground">30%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold uppercase">
        <span style={{ color: "#E6B800" }}>Carbs</span>
        <span className="text-muted-foreground">40%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold uppercase">
        <span style={{ color: "#DCE96A" }}>Fat</span>
        <span className="text-muted-foreground">30%</span>
      </div>
    </div>
  </div>
)

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState<Date | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)

  useEffect(() => {
    setToday(startOfToday())
    setMounted(true)
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const p = 30 + Math.floor(Math.random() * 20)
      const c = 60 + Math.floor(Math.random() * 40)
      const f = 20 + Math.floor(Math.random() * 15)
      
      data.push({
        date: format(d, "MMM d"),
        protein: p * 4,
        carbs: c * 4,
        fat: f * 9,
      })
    }
    setWeeklyData(data)
  }, [])

  useEffect(() => {
    if (!isUserLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isUserLoading, mounted, router])

  const dateId = today ? format(today, "yyyy-MM-dd") : ""

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const dailyLogRef = useMemoFirebase(() => (user && dateId) ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, [user, firestore, dateId])
  const mealsColRef = useMemoFirebase(() => (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

  const { data: profile } = useDoc(profileRef)
  const { data: dailyLog } = useDoc(dailyLogRef)
  const { data: meals } = useCollection(mealsColRef)

  const sortedMeals = useMemo(() => {
    if (!meals) return null;
    return [...meals].sort((a, b) => {
      const tA = a.time || "00:00 AM";
      const tB = b.time || "00:00 AM";
      const getMinutes = (t: string) => {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return getMinutes(tA) - getMinutes(tB);
    });
  }, [meals]);

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
  const water = dailyLog?.waterIntake || 0
  
  const actualPercent = Math.round((consumed / calorieTarget) * 100)
  const caloriePercentForProgress = Math.min(100, actualPercent)
  const isOverLimit = consumed > calorieTarget

  const totalMacrosKcal = (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9);
  const proteinPercent = totalMacrosKcal > 0 ? ((totals.protein * 4) / totalMacrosKcal) * 100 : 0;
  const carbsPercent = totalMacrosKcal > 0 ? ((totals.carbs * 4) / totalMacrosKcal) * 100 : 0;
  const fatPercent = totalMacrosKcal > 0 ? ((totals.fat * 9) / totalMacrosKcal) * 100 : 0;

  const adjustWater = (amount: number) => {
    if (!dailyLogRef || !dateId) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { waterIntake: Number(newWater.toFixed(1)), date: dateId }, { merge: true });
  }

  if (!mounted || isUserLoading || !user || !today) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-700">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Today</h1>
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Card className="md:col-span-8 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 sm:p-12 space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Energy Balance</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={cn("text-5xl font-black tracking-tight transition-colors", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-lg font-bold text-muted-foreground/30 tracking-tight">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary/80 hover:bg-secondary transition-all">
                    <Info className="w-5 h-5 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-6 rounded-[2.5rem] shadow-premium-lg border-none bg-white">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-5">
              <div className="flex h-5 w-full rounded-full overflow-hidden bg-secondary">
                <div style={{ width: `${proteinPercent}%`, backgroundColor: MACRO_COLORS.protein }} className="h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%`, backgroundColor: MACRO_COLORS.carbs }} className="h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%`, backgroundColor: MACRO_COLORS.fat }} className="h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[10px] font-black text-foreground uppercase tracking-widest gap-2">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.protein }} /> 
                  {Math.round(proteinPercent)}% Protein
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.carbs }} /> 
                  {Math.round(carbsPercent)}% Carbs
                </div>
                <div className="flex items-center gap-2 justify-end text-right">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.fat }} /> 
                  {Math.round(fatPercent)}% Fat
                </div>
              </div>
            </div>

            <div className="pt-2 text-left">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Goal Progress</span>
                <span className={cn("text-xs font-black", isOverLimit ? "text-destructive" : "text-primary")}>
                  {actualPercent}% {isOverLimit && "SURPLUS"}
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

        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-primary/10 rounded-[1.5rem] mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Burn</p>
              <p className="text-3xl font-black tracking-tight">{dailyLog?.caloriesBurned || 450} <span className="text-[12px] font-bold text-muted-foreground/60">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-premium-lg transition-all">
            <div className="p-4 bg-accent/10 rounded-[1.5rem] mb-4 group-hover:scale-110 transition-transform">
              <Droplets className="w-7 h-7 text-accent" />
            </div>
            <div className="space-y-5 w-full">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hydration</p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-black tracking-tight">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-10 w-10 rounded-full bg-primary shadow-sm hover:opacity-90">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-8">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-1 uppercase text-left">
          <BarChart3 className="w-6 h-6 text-primary" />
          Weekly Macro Trend
        </h2>
        <Card className="border-none shadow-premium rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-8 sm:p-12">
            <div className="h-[400px] w-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--muted)/0.4)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
                    unit="kcal"
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-8" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={28} name="Protein" />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" name="Carbs" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[6, 6, 0, 0]} name="Fat" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-1 uppercase text-left">
          <Utensils className="w-6 h-6 text-primary" />
          Daily Food Record
        </h2>
        <div className="space-y-6">
          {sortedMeals && sortedMeals.length > 0 ? (
            sortedMeals.map((meal) => (
              <Collapsible 
                key={meal.id} 
                open={expandedMealId === meal.id} 
                onOpenChange={(isOpen) => setExpandedMealId(isOpen ? meal.id : null)}
              >
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden hover:shadow-premium-lg transition-all group">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-6 flex items-center justify-between gap-6 cursor-pointer">
                      <div className="flex items-center gap-6 overflow-hidden">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                          {meal.imageUrl ? (
                            <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                          ) : (
                            <Utensils className="w-7 h-7 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 text-left space-y-1">
                          <h4 className="text-lg font-black truncate group-hover:text-primary transition-colors uppercase">{meal.name}</h4>
                          <div className="flex items-center gap-3">
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{meal.time} • {meal.calories} kcal</p>
                            <Badge className="h-5 px-2 py-0 text-[8px] font-black uppercase bg-accent/20 text-accent-foreground border-none">Score: {meal.healthScore || 85}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[9px] font-black uppercase" style={{ color: "#7FB79A" }}>Protein {meal.macros?.protein}g</span>
                            <span className="text-[9px] font-black uppercase" style={{ color: "#E6B800" }}>Carbs {meal.macros?.carbs}g</span>
                            <span className="text-[9px] font-black uppercase" style={{ color: "#C7D94F" }}>Fat {meal.macros?.fat}g</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={cn("bg-secondary p-2.5 rounded-full transition-all", expandedMealId === meal.id ? "rotate-180" : "")}>
                          <ChevronDown className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                    <div className="px-10 pb-10 pt-4 space-y-8 border-t border-muted/30">
                      <div className="space-y-6 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                            <Activity className="w-4 h-4" /> Health Score
                          </div>
                          <span className="text-2xl font-black text-primary tracking-tight">{meal.healthScore || 85}/100</span>
                        </div>
                        <Progress value={meal.healthScore || 85} className="h-3 rounded-full bg-secondary" indicatorClassName="bg-accent" />

                        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                          <Sparkles className="w-4 h-4" /> AI Health Insight
                        </div>
                        <p className="text-[13px] font-bold leading-relaxed text-foreground bg-primary/5 p-6 rounded-[1.5rem] border border-primary/10">
                          {meal.expertInsight || meal.description || "A nutritionally dense meal that aligns with your specific health targets."}
                        </p>
                      </div>
                      
                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                          <Leaf className="w-4 h-4" /> Key Ingredients
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {meal.ingredients?.map((ing: string, i: number) => (
                            <Badge key={i} variant="outline" className="rounded-xl border-muted/50 text-muted-foreground px-4 py-1 font-black text-[10px] uppercase">
                              {ing}
                            </Badge>
                          )) || <span className="text-[11px] text-muted-foreground/60 italic font-bold">Natural ingredients identified.</span>}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-[3rem] border-2 border-dashed border-muted/40 flex flex-col items-center justify-center">
              <p className="text-muted-foreground font-black text-sm uppercase tracking-widest opacity-40">No records found for today</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
        <Button 
          onClick={() => router.push("/record")}
          className="h-40 sm:h-48 rounded-[3rem] flex flex-col gap-4 bg-primary text-primary-foreground shadow-premium-lg hover:opacity-90 transition-all active:scale-[0.98] group border-none"
        >
          <div className="p-5 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.25em]">Snap Analysis</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="h-40 sm:h-48 rounded-[3rem] flex flex-col gap-4 bg-white text-primary border-none shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.98] group"
        >
          <div className="p-5 bg-accent/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.25em]">Explore Picks</span>
        </Button>
      </div>
    </div>
  )
}
