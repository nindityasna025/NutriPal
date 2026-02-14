
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
  BarChart3,
  Info,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from "lucide-react"
import { format, startOfToday, subDays } from "date-fns"
import { collection, doc, query, orderBy, limit, serverTimestamp, increment } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

const MACRO_COLORS = {
  protein: "hsl(var(--primary))", 
  carbs: "hsl(38 92% 50%)",      
  fat: "hsl(var(--accent))",     
}

const chartConfig = {
  protein: { label: "Protein", color: MACRO_COLORS.protein },
  carbs: { label: "Carbs", color: MACRO_COLORS.carbs },
  fat: { label: "Fat", color: MACRO_COLORS.fat },
} satisfies Record<string, any>

const MacroInfoContent = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-foreground font-black text-[11px] uppercase tracking-widest text-left">
      <Sparkles className="w-4 h-4 text-primary" /> Macro Balance Guide
    </div>
    <p className="text-[12px] font-bold leading-relaxed text-muted-foreground text-left">
      Daily energy distribution. Optimized for recovery and activity.
    </p>
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.protein }}>Protein</span>
        <span className="text-foreground">24%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.carbs }}>Carbs</span>
        <span className="text-foreground">43%</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-black uppercase">
        <span style={{ color: MACRO_COLORS.fat }}>Fat</span>
        <span className="text-foreground">33%</span>
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
  const { toast } = useToast()

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
  
  const logsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "dailyLogs"),
      orderBy("date", "desc"),
      limit(14)
    );
  }, [user, firestore]);

  const { data: profile } = useDoc(profileRef)
  const { data: dailyLog } = useDoc(dailyLogRef)
  const { data: meals } = useCollection(mealsColRef)
  const { data: logsData } = useCollection(logsQuery)

  const weeklyData = useMemo(() => {
    if (!today) return [];
    const days = [];
    for (let i = 7; i >= 1; i--) {
      const d = subDays(today, i);
      const dStr = format(d, "yyyy-MM-dd");
      const foundLog = logsData?.find(l => (l.date === dStr || l.id === dStr));
      
      if (foundLog) {
        days.push({
          date: format(d, "MMM d"),
          protein: Math.max(0, (foundLog.proteinTotal || 0) * 4),
          carbs: Math.max(0, (foundLog.carbsTotal || 0) * 4),
          fat: Math.max(0, (foundLog.fatTotal || 0) * 9),
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
  }, [logsData, today]);

  const totals = useMemo(() => {
    if (!meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return meals.filter(m => m.status === 'consumed').reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = Math.max(0, Math.round(totals.calories))
  const water = dailyLog?.waterIntake || 0
  
  const actualPercent = Math.round((consumed / calorieTarget) * 100)
  const caloriePercentForProgress = Math.min(100, actualPercent)
  const isOverLimit = consumed > calorieTarget

  const totalMacrosKcal = Math.max(0, (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9));
  const proteinPercent = totalMacrosKcal > 0 ? ((totals.protein * 4) / totalMacrosKcal) * 100 : 0;
  const carbsPercent = totalMacrosKcal > 0 ? ((totals.carbs * 4) / totalMacrosKcal) * 100 : 0;
  const fatPercent = totalMacrosKcal > 0 ? ((totals.fat * 9) / totalMacrosKcal) * 100 : 0;

  const adjustWater = (amount: number) => {
    if (!dailyLogRef || !dateId) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { waterIntake: Number(newWater.toFixed(1)), date: dateId }, { merge: true });
  }

  const markAsConsumed = (meal: any) => {
    if (!user || !mealsColRef || !dailyLogRef || meal.status === 'consumed') return

    setDocumentNonBlocking(dailyLogRef, {
      date: dateId,
      caloriesConsumed: increment(meal.calories),
      proteinTotal: increment(meal.macros?.protein || 0),
      carbsTotal: increment(meal.macros?.carbs || 0),
      fatTotal: increment(meal.macros?.fat || 0)
    }, { merge: true });

    updateDocumentNonBlocking(doc(mealsColRef, meal.id), { status: "consumed", updatedAt: serverTimestamp() });
    
    toast({ 
      title: "Bon Appétit!", 
      description: `${meal.name} synced to your daily records.` 
    });
  }

  const handleDropMeal = (meal: any) => {
    if (!user || !mealsColRef) return;
    deleteDocumentNonBlocking(doc(mealsColRef, meal.id));
    toast({
      variant: "destructive",
      title: "Meal Dropped",
      description: `${meal.name} removed from your record.`,
    });
  };

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

  if (!mounted || isUserLoading || !user || !today) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8 pb-24 min-h-screen">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Today</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-0.5em opacity-40">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-7 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 sm:p-12 space-y-12">
            <div className="flex justify-between items-start">
              <div className="space-y-1 text-left">
                <span className="text-[11px] font-black uppercase tracking-0.3em text-foreground opacity-60">Energy Balance</span>
                <div className="flex items-baseline gap-3">
                  <h2 className={cn("text-6xl font-black tracking-tighter text-foreground", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-xl font-black text-foreground opacity-20 tracking-tighter">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 border border-border/50">
                    <Info className="w-5 h-5 text-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-6 rounded-[2rem] shadow-premium-lg border-none bg-white">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-8">
              <div className="flex h-12 w-full rounded-full overflow-hidden bg-secondary border border-border/10 shadow-inner">
                <div style={{ width: `${proteinPercent}%`, backgroundColor: MACRO_COLORS.protein }} className="h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%`, backgroundColor: MACRO_COLORS.carbs }} className="h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%`, backgroundColor: MACRO_COLORS.fat }} className="h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[10px] font-black text-foreground uppercase tracking-widest gap-4">
                <div className="flex flex-col gap-1 items-start text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.protein }} /> 
                    <span style={{ color: MACRO_COLORS.protein }}>PROTEIN</span>
                  </div>
                  <span className="text-xl tracking-tighter">{Math.round(proteinPercent)}%</span>
                </div>
                <div className="flex flex-col gap-1 items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.carbs }} /> 
                    <span style={{ color: MACRO_COLORS.carbs }}>CARBS</span>
                  </div>
                  <span className="text-xl tracking-tighter">{Math.round(carbsPercent)}%</span>
                </div>
                <div className="flex flex-col gap-1 items-end text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS.fat }} /> 
                    <span style={{ color: MACRO_COLORS.fat }}>FAT</span>
                  </div>
                  <span className="text-xl tracking-tighter">{Math.round(fatPercent)}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-60">Goal Progress</span>
                <span className={cn("text-[12px] font-black uppercase tracking-tighter", isOverLimit ? "text-destructive" : "text-foreground")}>
                  {actualPercent}% {isOverLimit ? "Surplus" : "Consumed"}
                </span>
              </div>
              <Progress 
                value={caloriePercentForProgress} 
                className="h-4 rounded-full bg-secondary" 
                indicatorClassName={isOverLimit ? "bg-destructive" : "bg-primary"} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group transition-all">
            <div className="p-4 bg-primary/20 rounded-2xl mb-4 group-hover:scale-105 transition-transform border-2 border-primary/10">
              <Flame className="w-6 h-6 text-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-40">Active Burn</p>
              <p className="text-3xl font-black tracking-tighter text-foreground">{Math.max(0, dailyLog?.caloriesBurned || 450)} <span className="text-xs font-black text-foreground opacity-30">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group transition-all">
            <div className="p-4 bg-accent/20 rounded-2xl mb-4 group-hover:scale-105 transition-transform border-2 border-accent/10">
              <Droplets className="w-6 h-6 text-foreground" />
            </div>
            <div className="space-y-4 w-full">
              <p className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-40">Hydration</p>
              <div className="flex items-center justify-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-10 w-10 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/30">
                  <Minus className="w-4 h-4 text-foreground" />
                </Button>
                <span className="text-3xl font-black tracking-tighter text-foreground">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg hover:opacity-95 border-none">
                  <Plus className="w-4 h-4 text-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tighter flex items-center gap-4 px-2 uppercase text-left text-foreground">
          <BarChart3 className="w-7 h-7 text-foreground opacity-80" />
          Weekly Macro Trend
        </h2>
        <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-8 sm:p-10">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <ChartLegend content={<ChartLegendContent />} className="pt-8" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={32} name="Protein" />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" name="Carbs" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[6, 6, 0, 0]} name="Fat" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tighter flex items-center gap-4 px-2 uppercase text-left text-foreground">
          <Utensils className="w-7 h-7 text-foreground opacity-80" />
          Daily Food Record
        </h2>
        <div className="space-y-4">
          {sortedMeals && sortedMeals.length > 0 ? (
            sortedMeals.map((meal) => {
              const isExpanded = expandedMealId === meal.id;
              return (
                <Card 
                  key={meal.id} 
                  className={cn(
                    "border-none shadow-premium bg-white rounded-[2rem] overflow-hidden hover:shadow-premium-lg transition-all group cursor-pointer",
                    isExpanded && "ring-2 ring-primary/20"
                  )}
                  onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                >
                  <CardContent className="p-0">
                    <div className="p-6 sm:p-8 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6 flex-1 w-full text-left">
                        <div className="min-w-[100px] border-r-2 border-border/50 pr-6 hidden sm:block">
                          <p className="text-xl font-black text-foreground opacity-40 tracking-tighter uppercase">{meal.time}</p>
                        </div>
                        
                        {meal.imageUrl && (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0 border-2 border-border/50">
                            <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                          </div>
                        )}

                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black tracking-tighter uppercase leading-none text-foreground group-hover:text-primary transition-colors">
                              {meal.name}
                            </h3>
                            {meal.status === 'consumed' && (
                              <Badge className="h-5 px-2 text-[8px] font-black uppercase bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> CONSUMED
                              </Badge>
                            )}
                            {meal.reminderEnabled && meal.status !== 'consumed' && (
                              <Bell className="w-4 h-4 text-primary fill-primary/20" />
                            )}
                            {meal.allergenWarning && (
                              <Badge variant="destructive" className="h-5 px-2 text-[8px] font-black uppercase animate-pulse">
                                <AlertTriangle className="w-3 h-3 mr-1" /> ALLERGY ALERT
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-row items-center gap-6">
                            <p className="text-[11px] font-black text-foreground opacity-60 uppercase tracking-widest">+{Math.round(meal.calories)} KCAL</p>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                                <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.protein }}>PROTEIN {meal.macros?.protein}G</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                                <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.carbs }}>CARBS {meal.macros?.carbs}G</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                                <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: MACRO_COLORS.fat }}>FAT {meal.macros?.fat}G</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {meal.status !== 'consumed' && (
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsConsumed(meal);
                              }}
                              className="h-10 px-6 rounded-xl bg-primary text-foreground font-black uppercase text-[9px] tracking-widest border-none shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            >
                              EAT NOW
                            </Button>
                            <Button 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDropMeal(meal);
                              }}
                              className="h-10 px-4 rounded-xl text-foreground opacity-40 hover:opacity-100 hover:text-destructive font-black uppercase text-[9px] tracking-widest border border-border"
                            >
                              DROP
                            </Button>
                          </div>
                        )}
                        <div className="text-foreground opacity-30 group-hover:opacity-100 transition-all">
                          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-8 pb-8 pt-2 space-y-10 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t-2 border-border/30 pt-8">
                          <div className="space-y-6 text-left">
                             {meal.allergenWarning && (
                               <div className="bg-destructive/10 border-2 border-destructive/20 p-6 rounded-[1.5rem] flex flex-col gap-4 mb-4">
                                  <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
                                    <p className="text-[12px] font-bold text-foreground leading-tight">{meal.allergenWarning}</p>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" onClick={(e) => { e.stopPropagation(); markAsConsumed(meal); }} className="bg-primary text-foreground text-[8px] font-black uppercase tracking-widest h-8">EAT NOW</Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDropMeal(meal); }} className="border border-border text-[8px] font-black uppercase tracking-widest h-8 hover:text-destructive">DROP</Button>
                                  </div>
                               </div>
                             )}

                             <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-foreground opacity-60">Health Score</span>
                                <span className="text-2xl font-black text-foreground tracking-tighter">{meal.healthScore}/100</span>
                             </div>
                             <Progress value={meal.healthScore} className="h-3 rounded-full bg-secondary" indicatorClassName="bg-primary" />
                             
                             <section className="space-y-4 pt-2">
                                <div className="flex items-center gap-3 text-foreground font-black text-[10px] uppercase tracking-widest text-left">
                                  <Sparkles className="w-5 h-5 text-primary" /> AI Analysis
                                </div>
                                <div className="p-6 bg-primary/5 rounded-[1.5rem] border-2 border-primary/10">
                                   <p className="text-[13px] font-bold leading-relaxed text-foreground opacity-90 italic text-left">
                                     "{meal.expertInsight || meal.description || "Balanced meal designed for your profile."}"
                                   </p>
                                </div>
                             </section>
                          </div>

                          <section className="space-y-4 text-left">
                             <div className="flex items-center gap-3 text-foreground font-black text-[10px] uppercase tracking-widest text-left">
                                <ShoppingBag className="w-5 h-5 text-primary" /> Ingredients
                             </div>
                             <div className="bg-secondary/20 p-6 rounded-[2rem] border-2 border-border/30">
                                <div className="flex flex-wrap gap-2">
                                  {meal.ingredients?.map((ing: string, i: number) => (
                                    <span key={i} className="bg-white border-2 border-border px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight text-foreground">
                                      {ing}
                                    </span>
                                  )) || <span className="text-[10px] font-black opacity-30">No ingredients listed</span>}
                                </div>
                             </div>
                          </section>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-border/40 flex flex-col items-center justify-center shadow-premium">
              <p className="text-foreground font-black text-lg uppercase tracking-[0.2em] opacity-30">No records found</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6 pt-6">
        <Button 
          onClick={() => router.push("/record")}
          className="h-32 rounded-[2.5rem] flex flex-col gap-3 bg-primary text-primary-foreground shadow-premium-lg hover:opacity-95 transition-all group border-none"
        >
          <div className="p-3 bg-white/30 rounded-2xl group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.3em] text-foreground text-center">Snap Analysis</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/meal-planner")}
          className="h-32 rounded-[2.5rem] flex flex-col gap-3 bg-white text-foreground border-2 border-border shadow-premium hover:shadow-premium-lg transition-all group"
        >
          <div className="p-3 bg-accent/20 rounded-2xl group-hover:scale-110 transition-transform">
            <Utensils className="w-6 h-6 text-foreground opacity-60" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.3em] text-foreground text-center">Meal Planner</span>
        </Button>
      </div>
    </div>
  )
}
