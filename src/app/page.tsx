
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
import { format, startOfToday, subDays, parseISO, isSameDay } from "date-fns"
import { collection, doc, query, orderBy, limit } from "firebase/firestore"
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

// Standardized Macro Colors - Sharp Edition
const MACRO_COLORS = {
  protein: "hsl(var(--primary))", // Forest Green Brand
  carbs: "hsl(38 92% 50%)",      // Amber
  fat: "hsl(var(--accent))",     // Lime
}

const chartConfig = {
  protein: { label: "Protein", color: MACRO_COLORS.protein },
  carbs: { label: "Carbs", color: MACRO_COLORS.carbs },
  fat: { label: "Fat", color: MACRO_COLORS.fat },
} satisfies ChartConfig

const MacroInfoContent = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest text-left">
      <Sparkles className="w-3.5 h-3.5 text-primary" /> Macro Balance Guide
    </div>
    <p className="text-[12px] font-bold leading-relaxed text-muted-foreground text-left">
      Your daily energy distribution. We prioritize protein for recovery and carbs for activity.
    </p>
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.protein }}>Protein</span>
        <span className="text-foreground">30%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.carbs }}>Carbs</span>
        <span className="text-foreground">40%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.fat }}>Fat</span>
        <span className="text-foreground">30%</span>
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
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)

  useEffect(() => {
    setToday(startOfToday())
    setMounted(true)
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
  
  // Query for the last 7 daily logs
  const logsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "dailyLogs"),
      orderBy("date", "desc"),
      limit(7)
    );
  }, [user, firestore]);

  const { data: profile } = useDoc(profileRef)
  const { data: dailyLog } = useDoc(dailyLogRef)
  const { data: meals } = useCollection(mealsColRef)
  const { data: logsData } = useCollection(logsQuery)

  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, "yyyy-MM-dd");
      const foundLog = logsData?.find(l => l.date === dStr);
      
      if (foundLog) {
        days.push({
          date: format(d, "MMM d"),
          protein: (foundLog.proteinTotal || 0) * 4,
          carbs: (foundLog.carbsTotal || 0) * 4,
          fat: (foundLog.fatTotal || 0) * 9,
        });
      } else {
        days.push({
          date: format(d, "MMM d"),
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
    }
    return days;
  }, [logsData]);

  const sortedMeals = useMemo(() => {
    if (!meals) return null;
    return [...meals].sort((a, b) => {
      const getMinutes = (t: string) => {
        const parts = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!parts) return 0;
        let hours = parseInt(parts[1], 10);
        const minutes = parseInt(parts[2], 10);
        const modifier = parts[3].toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return getMinutes(a.time || "12:00 AM") - getMinutes(b.time || "12:00 AM");
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-700">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Today</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.2em] opacity-40">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Card className="md:col-span-8 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 sm:p-12 space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground opacity-60">Energy Balance</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={cn("text-5xl font-black tracking-tight transition-colors text-foreground", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-lg font-black text-foreground opacity-20 tracking-tight">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 transition-all border border-border/50">
                    <Info className="w-5 h-5 text-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-6 rounded-[2rem] shadow-premium-lg border-none bg-white">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-6">
              <div className="flex h-6 w-full rounded-full overflow-hidden bg-secondary border border-border/10">
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
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-60">Goal Progress</span>
                <span className={cn("text-xs font-black uppercase tracking-tighter", isOverLimit ? "text-destructive" : "text-foreground")}>
                  {actualPercent}% {isOverLimit ? "Surplus" : "Consumed"}
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
          <Card className="border-none shadow-premium rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center bg-white group transition-all">
            <div className="p-5 bg-primary/20 rounded-2xl mb-5 group-hover:scale-105 transition-transform">
              <Flame className="w-7 h-7 text-foreground opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-40">Active Burn</p>
              <p className="text-3xl font-black tracking-tight text-foreground">{dailyLog?.caloriesBurned || 450} <span className="text-[12px] font-black text-foreground opacity-30">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center bg-white group transition-all">
            <div className="p-5 bg-accent/20 rounded-2xl mb-5 group-hover:scale-105 transition-transform">
              <Droplets className="w-7 h-7 text-foreground opacity-60" />
            </div>
            <div className="space-y-6 w-full">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-40">Hydration</p>
              <div className="flex items-center justify-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-11 w-11 rounded-full bg-secondary/80 hover:bg-secondary">
                  <Minus className="w-4 h-4 text-foreground" />
                </Button>
                <span className="text-3xl font-black tracking-tight text-foreground">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90">
                  <Plus className="w-4 h-4 text-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-10">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-1 uppercase text-left text-foreground">
          <BarChart3 className="w-6 h-6 text-foreground opacity-80" />
          Weekly Macro Trend
        </h2>
        <Card className="border-none shadow-premium rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-10 sm:p-14">
            <div className="h-[400px] w-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--muted)/0.3)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 900 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 900 }}
                    unit="kcal"
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-10" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={32} name="Protein" />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" name="Carbs" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[8, 8, 0, 0]} name="Fat" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-10">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-1 uppercase text-left text-foreground">
          <Utensils className="w-6 h-6 text-foreground opacity-80" />
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
                    <CardContent className="p-6 sm:p-8 flex items-center justify-between gap-6 cursor-pointer">
                      <div className="flex items-center gap-8 overflow-hidden">
                        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                          {meal.imageUrl ? (
                            <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                          ) : (
                            <Utensils className="w-7 h-7 text-foreground opacity-60" />
                          )}
                        </div>
                        <div className="min-w-0 text-left space-y-1.5">
                          <h4 className="text-lg font-black truncate group-hover:text-primary transition-colors uppercase text-foreground">{meal.name}</h4>
                          <div className="flex flex-wrap items-center gap-4">
                            <p className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-40">{meal.time} • {meal.calories} kcal</p>
                            <Badge className="h-5 px-2.5 py-0 text-[8px] font-black uppercase bg-accent/30 text-foreground border-none">Score: {meal.healthScore || 85}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-[9px] font-black uppercase" style={{ color: MACRO_COLORS.protein }}>Protein {meal.macros?.protein}g</span>
                            <span className="text-[9px] font-black uppercase" style={{ color: MACRO_COLORS.carbs }}>Carbs {meal.macros?.carbs}g</span>
                            <span className="text-[9px] font-black uppercase" style={{ color: MACRO_COLORS.fat }}>Fat {meal.macros?.fat}g</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={cn("bg-secondary p-3 rounded-full transition-all", expandedMealId === meal.id ? "rotate-180" : "")}>
                          <ChevronDown className="w-4 h-4 text-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                    <div className="px-10 pb-12 pt-6 space-y-10 border-t border-border/30">
                      <div className="space-y-8 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                            <Activity className="w-4 h-4 text-primary" /> Health Score
                          </div>
                          <span className="text-2xl font-black text-foreground tracking-tight">{meal.healthScore || 85}/100</span>
                        </div>
                        <Progress value={meal.healthScore || 85} className="h-3 rounded-full bg-secondary" indicatorClassName="bg-accent" />

                        <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                          <Sparkles className="w-4 h-4 text-primary" /> AI Health Insight
                        </div>
                        <p className="text-[13px] font-bold leading-relaxed text-foreground bg-primary/10 p-7 rounded-[2rem] border border-primary/20">
                          {meal.expertInsight || meal.description || "A nutritionally dense meal that aligns with your specific health targets."}
                        </p>
                      </div>
                      
                      <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                          <Leaf className="w-4 h-4 text-primary" /> Key Ingredients
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {meal.ingredients?.map((ing: string, i: number) => (
                            <Badge key={i} variant="outline" className="rounded-xl border-border text-foreground opacity-80 px-5 py-1.5 font-black text-[10px] uppercase">
                              {ing}
                            </Badge>
                          )) || <span className="text-[11px] text-foreground opacity-30 italic font-black uppercase">Natural ingredients identified.</span>}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center shadow-premium">
              <p className="text-foreground font-black text-sm uppercase tracking-widest opacity-30">No records found for today</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-8">
        <Button 
          onClick={() => router.push("/record")}
          className="h-44 sm:h-52 rounded-[3rem] flex flex-col gap-5 bg-primary text-primary-foreground shadow-premium-lg hover:opacity-90 transition-all active:scale-[0.98] group border-none"
        >
          <div className="p-6 bg-white/20 rounded-2xl group-hover:scale-105 transition-transform">
            <Camera className="w-8 h-8 text-foreground" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.3em] text-foreground">Snap Analysis</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="h-44 sm:h-52 rounded-[3rem] flex flex-col gap-5 bg-white text-foreground border border-border shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.98] group"
        >
          <div className="p-6 bg-accent/20 rounded-2xl group-hover:scale-105 transition-transform">
            <Sparkles className="w-8 h-8 text-foreground opacity-60" />
          </div>
          <span className="font-black text-sm uppercase tracking-[0.3em] text-foreground">Explore Picks</span>
        </Button>
      </div>
    </div>
  )
}
