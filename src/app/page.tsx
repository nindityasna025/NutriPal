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
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Activity,
  List
} from "lucide-react"
import { format, startOfToday, subDays } from "date-fns"
import { collection, doc, query, orderBy, limit, serverTimestamp, increment } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend, Line } from "recharts"
import { Separator } from "@/components/ui/separator"

const MACRO_COLORS = {
  protein: "hsl(var(--primary))", 
  carbs: "hsl(38 92% 50%)",      
  fat: "hsl(var(--accent))",     
}

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState<Date | null>(null)
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)
  
  const [isEatNowOpen, setIsEatNowOpen] = useState(false)
  const [selectedMealForEatNow, setSelectedMealForEatNow] = useState<any | null>(null)

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
  const { data: recentLogs } = useCollection(logsQuery)

  const totals = useMemo(() => {
    if (!meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return meals.filter(m => m.status === 'consumed').reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const chartData = useMemo(() => {
    if (!today) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    return last7Days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      if (dateStr === dateId) { // Today
        return {
          date: format(day, "MMM d"),
          protein: Math.round((totals.protein || 0) * 4),
          carbs: Math.round((totals.carbs || 0) * 4),
          fat: Math.round((totals.fat || 0) * 9),
          "Calories Burned": dailyLog?.caloriesBurned || 450,
        };
      }
      const log = recentLogs?.find(l => l.date === dateStr);
      return {
        date: format(day, "MMM d"),
        protein: Math.round((log?.proteinTotal || 0) * 4),
        carbs: Math.round((log?.carbsTotal || 0) * 4),
        fat: Math.round((log?.fatTotal || 0) * 9),
        "Calories Burned": log?.caloriesBurned || Math.floor(Math.random() * (550 - 350 + 1) + 350),
      };
    });
  }, [recentLogs, today, dateId, totals, dailyLog]);

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = Math.max(0, Math.round(totals.calories))
  const water = dailyLog?.waterIntake || 0
  
  const actualPercent = Math.round((consumed / calorieTarget) * 100)
  const caloriePercentForProgress = Math.min(100, actualPercent)
  const isOverLimit = consumed > calorieTarget

  const totalMacrosKcal = Math.max(0, (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9));
  const proteinPercent = totalMacrosKcal > 0 ? Math.round(((totals.protein * 4) / totalMacrosKcal) * 100) : 0;
  const carbsPercent = totalMacrosKcal > 0 ? Math.round(((totals.carbs * 4) / totalMacrosKcal) * 100) : 0;
  const fatPercent = totalMacrosKcal > 0 ? Math.max(0, 100 - proteinPercent - carbsPercent) : 0;

  const adjustWater = (amount: number) => {
    if (!dailyLogRef || !dateId) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { waterIntake: Number(newWater.toFixed(1)), date: dateId }, { merge: true });
  }

  const handleEatNowClick = (meal: any) => {
    setSelectedMealForEatNow(meal)
    setIsEatNowOpen(true)
  }

  const markAsConsumedJustEat = () => {
    if (!user || !mealsColRef || !dailyLogRef || !selectedMealForEatNow) return
    const meal = selectedMealForEatNow;
    
    setDocumentNonBlocking(dailyLogRef, {
      date: dateId,
      caloriesConsumed: increment(meal.calories),
      proteinTotal: increment(meal.macros?.protein || 0),
      carbsTotal: increment(meal.macros?.carbs || 0),
      fatTotal: increment(meal.macros?.fat || 0)
    }, { merge: true });
    
    updateDocumentNonBlocking(doc(mealsColRef, meal.id), { status: "consumed", updatedAt: serverTimestamp() });
    toast({ title: "Bon Appétit!", description: `${meal.name} marked as eaten.` });
    setIsEatNowOpen(false)
  }

  const handleEatWithPhoto = () => {
    if (!selectedMealForEatNow) return
    router.push(`/record?updateId=${selectedMealForEatNow.id}&dateId=${dateId}`)
  }

  const handleDropMeal = (meal: any) => {
    if (!user || !mealsColRef) return;
    deleteDocumentNonBlocking(doc(mealsColRef, meal.id));
    toast({ variant: "destructive", title: "Meal Dropped", description: `${meal.name} removed.` });
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
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 space-y-4 pb-24 min-h-screen animate-in fade-in duration-700">
      <header className="space-y-1 pt-safe md:pt-4 text-center">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Today</h1>
        <p className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-40">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <Card className="md:col-span-7 border-none shadow-premium bg-white rounded-[2rem] overflow-hidden h-fit">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-40">ENERGY BALANCE</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={cn("text-3xl font-black tracking-tighter text-foreground", isOverLimit && "text-destructive")}>{consumed}</h2>
                  <span className="text-xs font-black text-foreground opacity-20 tracking-tighter">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full border border-border/50 text-foreground opacity-30">
                    <Info className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 rounded-2xl shadow-premium-lg border-none bg-white md:left-[calc(50%+8rem)]">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2">Macro Distribution</p>
                  <p className="text-xs font-medium text-muted-foreground">Optimal balance: 30% Protein, 40% Carbs, 30% Fat.</p>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <div className="flex h-4 w-full rounded-2xl overflow-hidden bg-secondary shadow-inner border border-border/10">
                <div style={{ width: `${proteinPercent}%`, backgroundColor: MACRO_COLORS.protein }} className="h-full transition-all duration-700" />
                <div style={{ width: `${carbsPercent}%`, backgroundColor: MACRO_COLORS.carbs }} className="h-full transition-all duration-700" />
                <div style={{ width: `${fatPercent}%`, backgroundColor: MACRO_COLORS.fat }} className="h-full transition-all duration-700" />
              </div>
              <div className="grid grid-cols-3 text-[8px] font-black text-foreground uppercase tracking-widest gap-2">
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} /> PROTEIN</div>
                  <p className="text-sm font-black tracking-tight">{proteinPercent}%</p>
                </div>
                <div className="space-y-0.5 text-center">
                  <div className="flex items-center gap-1 justify-center"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} /> CARBS</div>
                  <p className="text-sm font-black tracking-tight">{carbsPercent}%</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <div className="flex items-center gap-1 justify-end"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} /> FAT</div>
                  <p className="text-sm font-black tracking-tight">{fatPercent}%</p>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-border/30 space-y-1">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                <span className="opacity-40 tracking-widest">GOAL PROGRESS</span>
                <span className={cn("font-black", isOverLimit ? "text-destructive" : "text-primary")}>{actualPercent}% CONSUMED</span>
              </div>
              <Progress value={caloriePercentForProgress} className="h-1.5 rounded-full bg-secondary" indicatorClassName={isOverLimit ? "bg-destructive" : "bg-primary"} />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-5 flex flex-col gap-3">
          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-3 flex-1 flex flex-col items-center justify-center text-center min-h-[90px]">
            <div className="p-1.5 bg-primary/20 rounded-lg mb-1 border border-primary/10">
              <Flame className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-[8px] font-black text-foreground uppercase tracking-widest opacity-40">Active Burn</p>
            <p className="text-lg font-black tracking-tighter text-foreground">{dailyLog?.caloriesBurned || 450} <span className="text-[9px] font-black opacity-20">kcal</span></p>
          </Card>

          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-3 flex-1 flex flex-col items-center justify-center text-center min-h-[90px]">
            <div className="p-1.5 bg-accent/20 rounded-lg mb-1 border border-accent/10">
              <Droplets className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-[8px] font-black text-foreground uppercase tracking-widest opacity-40">Hydration</p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-7 w-7 rounded-full bg-secondary/80 border border-border/30 active:scale-90 transition-all">
                <Minus className="w-3 h-3 text-foreground" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-lg font-black tracking-tighter text-foreground">{water}L</span>
                <span className={cn(
                  "text-[7px] font-black uppercase tracking-tighter",
                  water >= 2 ? "text-green-600" : "text-orange-600"
                )}>
                  {water >= 2 ? "OPTIMAL" : "INADEQUATE"}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-sm active:scale-90 transition-all">
                <Plus className="w-3 h-3 text-foreground" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-3 pt-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h2 className="text-lg font-black tracking-tighter flex items-center gap-3 px-2 uppercase text-left text-foreground">
          <BarChart3 className="w-6 h-6 text-foreground opacity-80" /> WEEKLY MACRO TREND
        </h2>
        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
          <CardContent className="p-5 pt-10">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 900 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", fontSize: 8, fontWeight: 900 }} unit="kcal" />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#ff7300", fontSize: 8, fontWeight: 900 }} unit="kcal" />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--primary)/0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-border shadow-xl rounded-2xl">
                            <p className="font-black text-[9px] uppercase mb-1.5 border-b border-border pb-1">Daily Totals</p>
                            {payload.map((entry, idx) => (
                              <div key={idx} className="flex justify-between gap-4 text-[9px] font-black uppercase">
                                <span style={{ color: entry.color || (entry.dataKey === 'Calories Burned' ? '#ff7300' : 'inherit') }}>{entry.name}:</span>
                                <span>{entry.value} kcal</span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '15px' }} />
                  <Bar yAxisId="left" dataKey="protein" name="Protein" stackId="a" fill={MACRO_COLORS.protein} />
                  <Bar yAxisId="left" dataKey="carbs" name="Carbs" stackId="a" fill={MACRO_COLORS.carbs} />
                  <Bar yAxisId="left" dataKey="fat" name="Fat" stackId="a" fill={MACRO_COLORS.fat} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Calories Burned" stroke="#ff7300" strokeWidth={3} dot={{ r: 4, fill: "#ff7300" }} activeDot={{ r: 6 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3 pt-3">
        <h2 className="text-lg font-black tracking-tighter flex items-center gap-3 px-2 uppercase text-left text-foreground">
          <Utensils className="w-6 h-6 text-foreground opacity-80" /> DAILY FOOD RECORD
        </h2>
        <div className="space-y-3">
          {sortedMeals && sortedMeals.length > 0 ? (
            sortedMeals.map((meal) => {
              const isExpanded = expandedMealId === meal.id;
              return (
                <Card key={meal.id} className={cn("border-none shadow-premium bg-white rounded-[1.5rem] overflow-hidden hover:shadow-premium-lg transition-all group cursor-pointer", isExpanded && "ring-2 ring-primary/20")} onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}>
                  <CardContent className="p-0 text-left">
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 w-full text-left">
                        <div className="min-w-[80px] border-r border-border/50 pr-4 hidden sm:block text-center">
                          <p className="text-lg font-black text-foreground opacity-40 tracking-tighter uppercase">{meal.time}</p>
                        </div>
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-border/50 shrink-0 flex items-center justify-center bg-secondary/50">
                          {meal.imageUrl ? (
                            <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                          ) : (
                            <Utensils className="w-5 h-5 text-foreground opacity-20" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <h3 className="text-lg font-black tracking-tighter uppercase leading-none text-foreground">{meal.name}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-[8px] font-black text-foreground opacity-60 uppercase tracking-widest">
                            <span>+{Math.round(meal.calories)} KCAL</span>
                            <div className="flex gap-2">
                              <span style={{ color: MACRO_COLORS.protein }}>PROTEIN {meal.macros?.protein}g</span>
                              <span style={{ color: MACRO_COLORS.carbs }}>CARBS {meal.macros?.carbs}g</span>
                              <span style={{ color: MACRO_COLORS.fat }}>FAT {meal.macros?.fat}g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {meal.status === 'consumed' && (
                          <Badge className="h-3.5 px-1.5 text-[6px] font-black uppercase bg-green-500/10 text-green-600 border-none shrink-0">EATEN</Badge>
                        )}
                        {meal.status !== 'consumed' && (
                          <div className="flex items-center gap-2">
                            <Button onClick={(e) => { e.stopPropagation(); handleEatNowClick(meal); }} className="h-7 px-3 rounded-lg bg-primary text-foreground font-black uppercase text-[7px] tracking-widest border-none active:scale-95 transition-all shadow-sm">EAT NOW</Button>
                            {meal.allergenWarning && (
                              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleDropMeal(meal); }} className="h-7 px-2.5 rounded-lg text-destructive font-black uppercase text-[7px] tracking-widest border border-destructive/20 hover:bg-destructive/5">
                                <AlertTriangle className="w-3 h-3 mr-1" /> DROP
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="text-foreground opacity-20 group-hover:opacity-100 transition-all">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Separator className="bg-border/30" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 space-y-1">
                            <p className="text-[7px] font-black uppercase text-foreground opacity-40 flex items-center gap-1"><Activity className="w-2 h-2" /> Health Score</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-foreground">{meal.healthScore || 0}/100</span>
                            </div>
                          </div>
                          <div className="bg-accent/5 p-3 rounded-xl border border-accent/10 space-y-1">
                            <p className="text-[7px] font-black uppercase text-foreground opacity-40">Source</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[7px] h-4 font-black uppercase px-1.5 border-accent/20 text-accent-foreground">
                                {meal.source || 'Manual'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {meal.expertInsight && (
                          <div className="space-y-1.5">
                            <p className="text-[7px] font-black uppercase text-foreground opacity-40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> AI Expert Insight
                            </p>
                            <p className="text-[10px] font-bold leading-relaxed text-foreground opacity-80 italic text-left">
                              "{meal.expertInsight}"
                            </p>
                          </div>
                        )}

                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[7px] font-black uppercase text-foreground opacity-40 flex items-center gap-1">
                              <List className="w-2.5 h-2.5" /> Ingredients
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {meal.ingredients.map((ing: string, i: number) => (
                                <span key={i} className="text-[8px] font-black uppercase bg-secondary/50 px-2 py-0.5 rounded-lg text-foreground opacity-60">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {meal.allergenWarning && (
                          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-[9px] font-black text-destructive uppercase leading-tight">{meal.allergenWarning}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-16 bg-white/50 rounded-[2rem] border-2 border-dashed border-border/30 flex flex-col items-center justify-center">
              <p className="text-foreground opacity-40 font-black text-xs uppercase tracking-widest">No records found</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 pt-4">
        <Button onClick={() => router.push("/record")} className="h-16 rounded-[1.5rem] flex flex-col gap-1.5 bg-primary text-foreground shadow-premium-lg hover:opacity-95 border-none transition-transform active:scale-95">
          <Camera className="w-5 h-5" strokeWidth={2.5} />
          <span className="font-black text-[9px] uppercase tracking-widest">Snap Analysis</span>
        </Button>
        <Button variant="secondary" onClick={() => router.push("/meal-planner")} className="h-16 rounded-[1.5rem] flex flex-col gap-1.5 bg-white text-foreground border-2 border-border shadow-premium transition-transform active:scale-95">
          <Utensils className="w-5 h-5 opacity-60" strokeWidth={2.5} />
          <span className="font-black text-[9px] uppercase tracking-widest">Meal Planner</span>
        </Button>
      </div>

      <Dialog open={isEatNowOpen} onOpenChange={setIsEatNowOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 border-none shadow-premium-lg bg-white overflow-hidden md:left-[calc(50%+8rem)]">
          <DialogHeader className="p-8 bg-primary rounded-t-[2.5rem] text-center">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Record Consumption</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-4">
            <p className="text-xs font-bold text-foreground opacity-70 text-center leading-relaxed">
              How would you like to record your meal? Adding a photo provides a precise AI-powered nutritional update.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={handleEatWithPhoto} className="h-14 rounded-2xl bg-primary text-foreground font-black uppercase text-[10px] tracking-widest shadow-premium border-none">
                <Camera className="w-4 h-4 mr-2" /> Snap Live Photo
              </Button>
              <Button onClick={markAsConsumedJustEat} variant="outline" className="h-14 rounded-2xl border-2 border-border text-foreground font-black uppercase text-[10px] tracking-widest">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Just Mark Eaten
              </Button>
            </div>
          </div>
          <DialogFooter className="p-8 pt-0">
             <Button variant="ghost" onClick={() => setIsEatNowOpen(false)} className="w-full text-[9px] font-black uppercase text-foreground opacity-40">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
