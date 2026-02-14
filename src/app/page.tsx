
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
  Calendar,
  Trophy,
  BarChart3,
  Info
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
      Daily intake breakdown for sustained energy and recovery.
    </p>
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-primary">Protein</span>
        <span>15-35% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-accent">Carbs</span>
        <span>40-50% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
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

  if (!mounted || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 pb-32">
      <header className="space-y-1">
        <h1 className="text-5xl font-extrabold tracking-tighter text-foreground">Today</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          {format(today, "EEEE, MMMM do")}
        </p>
      </header>

      {/* Hero Calories Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Card className="md:col-span-8 border-none shadow-ios bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Daily Energy</span>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-6xl font-extrabold tracking-tighter">{consumed}</h2>
                  <span className="text-xl font-bold text-muted-foreground">/ {calorieTarget} kcal</span>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-secondary/50 hover:bg-secondary">
                    <Info className="w-5 h-5 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-6 rounded-[2rem] shadow-ios-lg border-none glass">
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
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> {totals.protein}g Protein</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /> {totals.carbs}g Carbs</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> {totals.fat}g Fat</span>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
                <span className="text-sm font-black text-primary">{caloriePercent}%</span>
              </div>
              <Progress value={caloriePercent} className="h-3 rounded-full bg-secondary" indicatorClassName="bg-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Sync Stats */}
        <div className="md:col-span-4 grid grid-cols-1 gap-6">
          <Card className="border-none shadow-ios rounded-[2rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-ios-lg transition-all">
            <div className="p-4 bg-primary/5 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Burned</p>
              <p className="text-4xl font-extrabold">{burned} <span className="text-sm font-bold text-muted-foreground">kcal</span></p>
            </div>
          </Card>

          <Card className="border-none shadow-ios rounded-[2rem] p-8 flex flex-col items-center justify-center text-center bg-white group hover:shadow-ios-lg transition-all">
            <div className="p-4 bg-blue-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
              <Droplets className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-4 w-full">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Hydration</p>
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="icon" onClick={() => adjustWater(-0.2)} className="h-10 w-10 rounded-full border border-border/50 bg-secondary/30">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-4xl font-extrabold whitespace-nowrap">{water}L</span>
                <Button variant="ghost" size="icon" onClick={() => adjustWater(0.2)} className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Trends */}
      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          Weekly Overview
        </h2>
        <Card className="border-none shadow-ios rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--border)/0.5)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-8" />
                  <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" barSize={40} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" />
                  <Bar dataKey="fat" stackId="a" fill="var(--color-fat)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Meals List */}
      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight px-2">Daily Report</h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
          ) : meals && meals.length > 0 ? (
            meals.map((meal) => (
              <Card 
                key={meal.id} 
                className="rounded-[2rem] border-none shadow-ios hover:shadow-ios-lg transition-all cursor-pointer overflow-hidden group bg-white"
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-secondary rounded-2xl relative overflow-hidden flex-shrink-0 shadow-sm">
                      <Image 
                        src={`https://picsum.photos/seed/${meal.id}/200`} 
                        alt={meal.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        data-ai-hint="delicious meal"
                      />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xl tracking-tight">{meal.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary">+{meal.calories}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">kcal</span>
                  </div>
                </div>
                {expandedMeal === meal.id && (
                  <div className="px-8 pb-8 pt-2 border-t border-border/20 animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="text-center p-4 bg-primary/5 rounded-2xl">
                        <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1">Protein</span>
                        <span className="text-xl font-extrabold">{meal.macros?.protein}g</span>
                      </div>
                      <div className="text-center p-4 bg-accent/10 rounded-2xl">
                        <span className="block text-[10px] font-black text-accent uppercase tracking-widest mb-1">Carbs</span>
                        <span className="text-xl font-extrabold">{meal.macros?.carbs}g</span>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-2xl">
                        <span className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Fat</span>
                        <span className="text-xl font-extrabold">{meal.macros?.fat}g</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight text-primary">Health Score: {meal.healthScore}/100</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground/40 hover:text-primary ml-auto">
                              <Info className="w-3.5 h-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-6 rounded-[2rem] shadow-ios-lg border-none glass">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                                <Trophy className="w-4 h-4" /> Health Benefit Score
                              </div>
                              <p className="text-xs font-medium leading-relaxed text-foreground/80">
                                Health Benefit score is a quick 0-100 rate of how healthy your meal is.
                                Behind the scenes, our algorithm checks for proteins, complex carbs, healthy fats, fiber, vitamins and minerals. It also filters for ultra-processed foods, refined grains, and added sugars.
                                The closer to 100, the more nutrient-rich your meal is!
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-secondary/20 rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center gap-6">
              <Utensils className="w-16 h-16 text-muted-foreground/10" />
              <div className="space-y-1">
                <p className="text-muted-foreground font-extrabold text-lg">No activity logged today.</p>
                <p className="text-sm text-muted-foreground font-medium">Capture your first meal to start tracking.</p>
              </div>
              <Button onClick={() => router.push("/meal-planner")} className="rounded-full px-10 h-14 font-black uppercase tracking-widest shadow-ios-lg">
                PLAN
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Action Hub */}
      <div className="flex gap-6 pt-6">
        <Button 
          onClick={() => router.push("/record")}
          className="flex-1 h-36 rounded-[2.5rem] flex flex-col gap-3 bg-primary text-primary-foreground shadow-ios-lg hover:shadow-ios-lg transition-all active:scale-95 group"
        >
          <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8" />
          </div>
          <span className="font-black text-xs uppercase tracking-[0.2em]">Snap Meal</span>
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push("/planner")}
          className="flex-1 h-36 rounded-[2.5rem] flex flex-col gap-3 bg-white text-primary border-none shadow-ios hover:shadow-ios-lg transition-all active:scale-95 group"
        >
          <div className="p-4 bg-primary/5 rounded-2xl group-hover:scale-110 transition-transform">
            <Sparkles className="w-8 h-8" />
          </div>
          <span className="font-black text-xs uppercase tracking-[0.2em]">Explore Deals</span>
        </Button>
      </div>

      {/* AI Wellness Insights Card */}
      <Card className="rounded-[3rem] border-none shadow-ios-lg bg-primary text-primary-foreground p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="flex items-center gap-4">
             <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
               <Sparkles className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-black uppercase tracking-tight">AI Wellness Coach</h2>
          </div>
          <p className="text-xl font-bold leading-relaxed opacity-90 italic">
            "You&apos;re doing great! Your protein levels are optimal for recovery today. Try adding a bit more water after your next meal to boost digestion."
          </p>
        </div>
      </Card>
    </div>
  )
}
