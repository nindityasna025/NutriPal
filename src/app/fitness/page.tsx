
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
    Activity, 
    Flame, 
    RefreshCw, 
    Smartphone, 
    Watch, 
    CheckCircle2,
    Loader2,
    Plus,
    Clock,
    Utensils,
    Bike,
    ChevronLeft,
    Sparkles,
    BarChart3
} from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { format, startOfToday, subDays, addDays } from "date-fns"
import { collection, doc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { generateDailyPlan } from "@/ai/flows/generate-daily-plan"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function FitnessPage() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const { toast } = useToast()

  const { user } = useUser()
  const firestore = useFirestore()
  const [today, setToday] = useState<Date | null>(null)

  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false)
  const [loadingRecoveryPlan, setLoadingRecoveryPlan] = useState(false)
  const [recoveryPlan, setRecoveryPlan] = useState<any | null>(null)
  const [swappedRecoveryMeals, setSwappedRecoveryMeals] = useState<Record<string, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
  })

  useEffect(() => {
    setToday(startOfToday())
    setLastSync(new Date().toLocaleTimeString())
  }, [])

  const dateId = today ? format(today, "yyyy-MM-dd") : ""

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const dailyLogRef = useMemoFirebase(() => (user && dateId) ? doc(firestore, "users", user.uid, "dailyLogs", dateId) : null, [user, firestore, dateId])
  
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
  const { data: recentLogs } = useCollection(logsQuery)

  const caloriesBurned = dailyLog?.caloriesBurned || 0;
  const wasHighlyActive = caloriesBurned > 700;

  const chartData = useMemo(() => {
    if (!today) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    return last7Days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const log = recentLogs?.find(l => l.date === dateStr);
      return {
        day: format(day, "E"),
        kcal: log?.caloriesBurned || (dateStr === dateId ? caloriesBurned : 0),
      };
    });
  }, [recentLogs, today, dateId, caloriesBurned]);

  const handleGenerateRecoveryPlan = async () => {
    if (!profile) return
    setLoadingRecoveryPlan(true)
    setRecoveryPlan(null)
    setSwappedRecoveryMeals({ breakfast: false, lunch: false, dinner: false })
    try {
      const dietTypeParts = [
        ...(profile.dietaryRestrictions || []),
        'High Protein',
      ]
      const plan = await generateDailyPlan({
        calorieTarget: (profile.calorieTarget || 2000) + 300,
        proteinPercent: 40,
        carbsPercent: 40,
        fatPercent: 20,
        dietType: dietTypeParts.join(", "),
        allergies: profile.allergies,
      })
      setRecoveryPlan(plan)
    } catch (err: any) {
      console.error(err)
      toast({ variant: "destructive", title: "Synthesis Error", description: "AI could not generate a plan." })
    } finally {
      setLoadingRecoveryPlan(false)
    }
  }

  const handleSwapRecoveryMeal = (type: string) => {
    setSwappedRecoveryMeals(prev => ({ ...prev, [type]: !prev[type] }))
    toast({ title: "Meal Swapped", description: `Showing alternative for ${type}.` })
  }

  const handleAcceptRecoveryPlan = async () => {
    if (!user || !firestore || !recoveryPlan || !today) return;
    const targetDate = format(addDays(today, 1), "yyyy-MM-dd");
    const dailyLogRefForTarget = doc(firestore, "users", user.uid, "dailyLogs", targetDate);
    const mealsColRefForTarget = collection(dailyLogRefForTarget, "meals");
    
    setDocumentNonBlocking(dailyLogRefForTarget, { date: targetDate }, { merge: true });

    const types = ["breakfast", "lunch", "dinner"] as const;
    types.forEach(type => {
      const isSwapped = swappedRecoveryMeals[type];
      const baseMeal = recoveryPlan[type];
      const item = isSwapped ? baseMeal.swapSuggestion : baseMeal;
      const finalTime = item.time || baseMeal.time || "12:00 PM";

      addDocumentNonBlocking(mealsColRefForTarget, {
        name: item.name,
        calories: item.calories,
        time: finalTime,
        source: "planner",
        macros: item.macros,
        healthScore: 90,
        description: item.description,
        expertInsight: "Recovery-focused synthesis.",
        ingredients: item.ingredients || [],
        instructions: item.instructions || [],
        status: "planned",
        createdAt: serverTimestamp()
      });
    });

    toast({ title: "Recovery Plan Saved", description: `Plan for tomorrow has been scheduled.` });
    setIsRecoveryDialogOpen(false);
  }

  const handleSync = () => {
    setSyncing(true)
    const simulatedBurn = Math.floor(Math.random() * (900 - 400 + 1) + 400);
    if(dailyLogRef) {
        setDocumentNonBlocking(dailyLogRef, { caloriesBurned: simulatedBurn, date: dateId }, { merge: true });
    }
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date().toLocaleTimeString())
      toast({ title: "Sync Complete", description: "All device metrics updated." })
    }, 1500)
  }
  
  if (!user || !today) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-24">
        <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase text-center">
            Fitness Sync
          </h1>
          <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Activity Integration</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <button 
              onClick={handleSync} 
              disabled={syncing}
              className="w-full rounded-full bg-white border border-border text-foreground hover:bg-muted font-semibold shadow-sm px-10 h-12 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Syncing..." : "Sync Devices"}
            </button>
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Connected Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Watch className="text-primary w-6 h-6" />
                    <div>
                      <p className="font-bold">Apple Watch S9</p>
                      <p className="text-xs text-muted-foreground">Connected • Active</p>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Smartphone className="text-muted-foreground w-6 h-6" />
                    <div>
                      <p className="font-bold">Health Connect</p>
                      <p className="text-xs text-muted-foreground">Synced via iPhone</p>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <p className="text-[10px] text-center text-muted-foreground">Last synced: {lastSync}</p>
              </CardContent>
            </Card>
          </div>
          <Dialog open={isRecoveryDialogOpen} onOpenChange={(open) => {
              if (open && !wasHighlyActive) return;
              setIsRecoveryDialogOpen(open);
              if(open && !recoveryPlan) handleGenerateRecoveryPlan();
          }}>
            <Card className="border-none shadow-lg p-6 flex flex-col items-center justify-center text-center">
              <DialogTrigger asChild disabled={!wasHighlyActive}>
                <button
                  className={cn(
                      "p-3 rounded-2xl mb-3 transition-all",
                      wasHighlyActive ? "bg-destructive/10 border border-destructive/20 animate-pulse cursor-pointer" : "bg-primary/10 border-primary/20 cursor-default"
                  )}
                  >
                  <Flame className={cn("w-8 h-8", wasHighlyActive ? "text-destructive" : "text-foreground")} />
                </button>
              </DialogTrigger>
              <p className="text-sm font-black text-foreground uppercase tracking-widest opacity-40">Today's Active Burn</p>
              <p className="text-4xl font-black tracking-tighter text-foreground">{caloriesBurned} <span className="text-lg font-black opacity-20">kcal</span></p>
            </Card>
            <DialogContent className="max-w-6xl rounded-[2.5rem] p-0 border-none shadow-premium-lg bg-background w-[94vw] max-h-[90vh] flex flex-col">
              <DialogHeader className="p-8 text-center border-b">
                <DialogTitle className="text-2xl text-center">Recovery Plan Synthesis</DialogTitle>
                <DialogDescription className="max-w-2xl mx-auto">
                    Today was a highly active day! This recommends increasing your protein and calorie intake to support muscle recovery tomorrow.
                </DialogDescription>
              </DialogHeader>
              <div className="p-8 overflow-y-auto flex-1">
                {loadingRecoveryPlan ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4 h-full">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Synthesizing Recovery Path...</p>
                  </div>
                ) : recoveryPlan && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(["breakfast", "lunch", "dinner"] as const).map((type) => {
                      const isSwapped = swappedRecoveryMeals[type];
                      const baseMeal = recoveryPlan[type];
                      const meal = isSwapped ? baseMeal.swapSuggestion : baseMeal;
                      const finalTime = meal.time || baseMeal.time || "12:00 PM";
                      return (
                        <Card key={type} className="rounded-[2rem] border shadow-premium bg-card group transition-all ring-primary/20 hover:ring-4 overflow-hidden flex flex-col relative">
                          <Button variant="outline" size="icon" onClick={() => handleSwapRecoveryMeal(type)} className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm">
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </Button>
                          <CardContent className="p-5 flex flex-col h-full space-y-4 text-left">
                            <div className="flex-1 space-y-3">
                              <Badge variant="secondary" className="bg-primary/10 text-primary-foreground uppercase text-[8px] font-black tracking-widest px-3 py-1 rounded-lg border-none">{type}</Badge>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 opacity-40" />
                                  <span className="text-[9px] font-black uppercase opacity-50">{finalTime}</span>
                                </div>
                                <h3 className="text-base font-black tracking-tighter uppercase text-foreground line-clamp-1">{meal.name}</h3>
                                <p className="text-[10px] font-bold leading-snug text-muted-foreground line-clamp-2">{meal.description}</p>
                              </div>
                              
                              {meal.ingredients && (
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-[8px] font-bold rounded-md px-2 py-0.5">{ing}</Badge>
                                    ))}
                                    {meal.ingredients.length > 4 && <Badge variant="outline" className="text-[8px] font-bold rounded-md px-2 py-0.5">+{meal.ingredients.length - 4} more</Badge>}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2 border-y py-3">
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-muted-foreground uppercase">Protein</p>
                                  <p className="text-sm font-black text-primary">{meal.macros.protein}g</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-muted-foreground uppercase">Carbs</p>
                                  <p className="text-sm font-black" style={{ color: "hsl(221.2 83.2% 53.3%)" }}>{meal.macros.carbs}g</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-black text-muted-foreground uppercase">Fat</p>
                                  <p className="text-sm font-black text-accent">{meal.macros.fat}g</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              <DialogFooter className="p-6 border-t bg-background rounded-b-[2.5rem]">
                  {recoveryPlan && !loadingRecoveryPlan && (
                  <Button onClick={handleAcceptRecoveryPlan} className="w-full">
                      <Plus className="w-4 h-4 mr-2" /> Schedule For Tomorrow
                  </Button>
                  )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card className="col-span-1 md:col-span-2 border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Weekly Calories Burned</CardTitle>
              <CardDescription>Based on active workout minutes and steps.</CardDescription>
            </div>
            <BarChart3 className="text-primary w-8 h-8" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="day" 
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
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--primary)/0.1)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-border shadow-lg rounded-lg">
                            <p className="font-bold text-sm">{`${payload[0].value} kcal`}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="kcal" 
                    name="Calories Burned"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
