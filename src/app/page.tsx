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
import { Badge } from "@/components/ui/badge"

const chartConfig = {
  protein: {
    label: "Protein",
    color: "hsl(var(--destructive))",
  },
  carbs: {
    label: "Carbs",
    color: "#EAB308",
  },
  fat: {
    label: "Fat",
    color: "#3B82F6",
  },
} satisfies ChartConfig

const MacroInfoContent = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
      <Sparkles className="w-4 h-4" /> Macro Balance Guide
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Daily intake breakdown for sustained energy and recovery.
    </p>
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-destructive">Protein</span>
        <span>15-35% daily</span>
      </div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-yellow-600">Carbs</span>
        <span>40-50% daily</span>
      </div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-blue-500">Fat</span>
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
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      data.push({
        date: format(d, "MMM d"),
        protein: 300 + Math.floor(Math.random() * 150),
        carbs: 600 + Math.floor(Math.random() * 300),
        fat: 200 + Math.floor(Math.random() * 200),
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 2000
  const consumed = dailyLog?.caloriesConsumed || (meals?.reduce((sum, m) => sum + m.calories, 0) || 0)
  const burned = dailyLog?.caloriesBurned || 450
  const water = dailyLog?.waterIntake || 1.8
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
      {/* Header - Material Typography Hierarchy */}
      <section className="px-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Today</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          {format(today, "EEEE, MMMM do")}
        </p>
      </section>

      {/* Hero Card - Material Elevation 2 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-7 border-none elevation-2 bg-card rounded-[1.5rem] overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-baseline">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Consumed</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-bold">{consumed}</h2>
                  <span className="text-lg font-medium text-muted-foreground">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground/50 hover:text-primary">
                    <Info className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 rounded-xl elevation-3 border-none shadow-xl">
                  <MacroInfoContent />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-secondary">
                <div style={{ width: '25%' }} className="bg-destructive h-full transition-all duration-500" />
                <div style={{ width: '45%' }} className="bg-yellow-500 h-full transition-all duration-500" />
                <div style={{ width: '30%' }} className="bg-blue-500 h-full transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                <span>Protein 25g</span>
                <span>Carbs 45g</span>
                <span>Fat 30g</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground">Daily Goal</span>
                <span className="text-xs font-bold text-primary">{caloriePercent}%</span>
              </div>
              <Progress value={caloriePercent} className="h-2 rounded-full bg-secondary" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - Elevation 1 */}
        <div className="md:col-span-5 grid grid-cols-1 gap-6">
          <Card className="border-none elevation-1 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <Flame className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Burned</p>
                <p className="text-2xl font-bold">{burned} kcal</p>
              </div>
            </div>
          </Card>

          <Card className="border-none elevation-1 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Droplets className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hydration</p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-8 w-8 rounded-full border border-border">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold">{water}L</span>
                  <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5">
                    <Plus className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Trends - MD3 Adaptive Container */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold px-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Weekly Progress
        </h2>
        <Card className="border-none elevation-1 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-6" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={32} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Meals - Material List Pattern */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold px-2 uppercase tracking-tight">Daily Log</h2>
        <div className="space-y-3">
          {isLoadingMeals ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card 
                key={meal.id} 
                className="rounded-2xl border-none elevation-1 hover:elevation-2 transition-all cursor-pointer overflow-hidden group bg-card"
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              >
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-muted rounded-xl relative overflow-hidden flex-shrink-0">
                      <Image 
                        src={`https://picsum.photos/seed/${meal.id}/200`} 
                        alt={meal.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{meal.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">+{meal.calories}</span>
                    <span className="text-[10px] font-bold text-muted-foreground ml-1">KCAL</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                        <span className="block text-[9px] font-bold text-destructive uppercase">Protein</span>
                        <span className="text-sm font-bold">{meal.macros?.protein}g</span>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200/50">
                        <span className="block text-[9px] font-bold text-yellow-600 uppercase">Carbs</span>
                        <span className="text-sm font-bold">{meal.macros?.carbs}g</span>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200/50">
                        <span className="block text-[9px] font-bold text-blue-500 uppercase">Fat</span>
                        <span className="text-sm font-bold">{meal.macros?.fat}g</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase">Health Score: {meal.healthScore}/100</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-4 rounded-xl elevation-3 border-none">
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Nutrient density score based on fiber, proteins, and minerals vs processed additives.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border flex flex-col items-center gap-4">
              <Utensils className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No activity logged for today.</p>
              <Button onClick={() => router.push("/record")} className="rounded-full px-8 h-12 font-bold elevation-1">
                Log Your First Meal
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Action FABs - Material Design Pattern */}
      <div className="flex gap-4 pt-4">
        <Button 
          onClick={() => router.push("/record")}
          className="flex-1 h-32 rounded-3xl flex flex-col gap-2 bg-primary text-primary-foreground elevation-2 hover:elevation-3 transition-all active:scale-95"
        >
          <Camera className="w-8 h-8" />
          <span className="font-bold text-xs uppercase tracking-widest">Snap Meal</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/meal-planner")}
          className="flex-1 h-32 rounded-3xl flex flex-col gap-2 bg-card text-foreground border-none elevation-1 hover:elevation-2 transition-all active:scale-95"
        >
          <Calendar className="w-8 h-8 text-primary" />
          <span className="font-bold text-xs uppercase tracking-widest text-primary">Plan Day</span>
        </Button>
      </div>

      {/* AI Wellness Insight - Elevated Banner */}
      <Card className="rounded-3xl border-none elevation-2 bg-primary text-primary-foreground p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg">
               <Sparkles className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-bold uppercase tracking-tight">AI Wellness</h2>
          </div>
          <p className="text-base font-medium opacity-90 italic">
            "Your protein intake is excellent today. Try adding a bit more water after your next meal to optimize digestion."
          </p>
        </div>
      </Card>
    </div>
  )
}