"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Flame, 
  Footprints, 
  Droplets, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Utensils,
  CheckCircle2,
  Loader2,
  History,
  Plus,
  Minus,
  Lightbulb,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Leaf,
  Zap,
  Activity
} from "lucide-react"
import { format, addDays, subDays, startOfToday, eachDayOfInterval, isSameDay } from "date-fns"
import { collection, doc, setDoc, increment } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

// Mock data updated with rich details
const MOCK_MEALS = [
  { 
    id: "m1", 
    name: "Avocado & Egg Toast", 
    calories: 320, 
    time: "02:30 PM", 
    source: "PHOTO",
    macros: { protein: 12, carbs: 28, fat: 18 },
    healthScore: 85,
    description: "This meal offers a perfect balance of healthy fats from avocado and high-quality protein from eggs. Excellent for brain health and sustained energy.",
    ingredients: ["Sourdough bread", "Avocado", "Poached egg", "Red pepper flakes", "Lemon juice"]
  },
  { 
    id: "m2", 
    name: "Quinoa Salad Bowl", 
    calories: 410, 
    time: "10:30 AM", 
    source: "PLANNER",
    macros: { protein: 15, carbs: 45, fat: 12 },
    healthScore: 92,
    description: "Quinoa provides all nine essential amino acids. The fiber content keeps you full and helps with digestion.",
    ingredients: ["Quinoa", "Cucumber", "Cherry tomatoes", "Chickpeas", "Olive oil dressing"]
  },
]

export default function Dashboard() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  useEffect(() => {
    setSelectedDate(startOfToday())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isUserLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isUserLoading, mounted, router])

  const dateId = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

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
  const { data: meals } = useCollection(mealsColRef)

  if (!mounted || isUserLoading || !user || !selectedDate) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white z-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg animate-pulse">NutriPal is syncing...</p>
      </div>
    )
  }

  const calorieTarget = profile?.calorieTarget || 1936
  const consumed = dailyLog?.caloriesConsumed || (meals && meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) : 438)
  const burned = dailyLog?.caloriesBurned || 450 
  const water = dailyLog?.waterIntake || 1.8
  
  const proteinTarget = profile?.proteinTarget || 25
  const carbsTarget = profile?.carbsTarget || 45
  const fatTarget = profile?.fatTarget || 30

  // Calculation for the circular view
  const caloriePercent = Math.min(100, Math.round((consumed / calorieTarget) * 100))
  
  // Weekly dates
  const weekStart = subDays(selectedDate, 3)
  const weekEnd = addDays(selectedDate, 3)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const displayMeals = (meals && meals.length > 0) ? meals : (dateId === format(new Date(), "yyyy-MM-dd") ? MOCK_MEALS : [])

  const adjustWater = (amount: number) => {
    if (!dailyLogRef) return;
    const newWater = Math.max(0, water + amount);
    setDocumentNonBlocking(dailyLogRef, { 
      waterIntake: Number(newWater.toFixed(1)),
      date: dateId
    }, { merge: true });
  }

  const getSuggestion = () => {
    if (water < 2.0) return "You're a bit low on hydration. Try to drink 2 more glasses before dinner!";
    if (burned > 600 && consumed < calorieTarget - 500) return "High activity detected! Consider a protein-rich snack for recovery.";
    if (consumed > calorieTarget) return "You've reached your calorie goal. Focus on fiber-rich vegetables for the rest of the day.";
    return "You're doing great! Consistency is key to reaching your wellness goals.";
  }

  const llamaImage = PlaceHolderImages.find(img => img.id === 'llama-avatar')?.imageUrl || "https://picsum.photos/seed/llama-style/400/400"

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 animate-in fade-in duration-700 pb-32">
      {/* Top Calorie Summary */}
      <section className="text-center space-y-1">
        <h1 className="text-7xl font-black tracking-tighter text-foreground">{consumed}</h1>
        <p className="text-muted-foreground font-bold text-lg">{caloriePercent}% from {calorieTarget} calories goal</p>
      </section>

      {/* Central Visualization */}
      <section className="relative flex justify-center items-center py-10">
        <div className="relative w-[320px] h-[320px] flex justify-center items-center">
          {/* Circular Rings (Simple SVG implementation) */}
          <svg className="absolute w-full h-full -rotate-90">
            {/* Calories Burned Ring (Red) */}
            <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--muted))" strokeWidth="24" strokeLinecap="round" />
            <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--destructive))" strokeWidth="24" strokeDasharray={`${(burned/1000) * 880} 880`} strokeLinecap="round" className="transition-all duration-1000 opacity-20" />
            
            {/* Inner rings for macros */}
            <circle cx="160" cy="160" r="110" fill="none" stroke="hsl(var(--muted))" strokeWidth="18" strokeLinecap="round" />
          </svg>

          {/* Avatar & Macro Indicators */}
          <div className="z-10 relative flex flex-col items-center gap-4">
             {/* Llama Avatar */}
             <div className="w-48 h-48 relative rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white">
                <Image 
                  src={llamaImage} 
                  alt="Llama Mascot" 
                  fill 
                  className="object-cover"
                  data-ai-hint="llama mascot"
                />
             </div>
          </div>

          {/* Absolute Positioned Macro Icons */}
          {/* Protein (Blue) */}
          <div className="absolute top-[20%] left-[5%] bg-blue-500 p-2.5 rounded-full shadow-lg border-4 border-white">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          {/* Burned (Red) */}
          <div className="absolute top-[5%] right-[20%] bg-destructive p-2.5 rounded-full shadow-lg border-4 border-white">
            <Flame className="w-5 h-5 text-white" />
          </div>
          {/* Carbs (Green) */}
          <div className="absolute bottom-[5%] left-[40%] bg-green-500 p-2.5 rounded-full shadow-lg border-4 border-white">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          {/* Fat (Yellow) */}
          <div className="absolute bottom-[20%] right-[5%] bg-yellow-500 p-2.5 rounded-full shadow-lg border-4 border-white">
            <Zap className="w-5 h-5 text-white" />
          </div>

          {/* Streak Indicator (Left) */}
          <div className="absolute left-[-60px] top-1/2 -translate-y-1/2 text-center space-y-1">
            <Footprints className="w-10 h-10 mx-auto text-foreground" strokeWidth={2.5} />
            <p className="text-2xl font-black">1d</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">streak</p>
          </div>
        </div>
      </section>

      {/* Macro Percentages */}
      <section className="flex justify-center gap-10 text-xl font-black">
        <div className="flex items-center gap-2"><span className="text-blue-500">16%</span> <span className="text-sm font-bold text-muted-foreground lowercase">protein</span></div>
        <div className="flex items-center gap-2"><span className="text-green-500">67%</span> <span className="text-sm font-bold text-muted-foreground lowercase">carbs</span></div>
        <div className="flex items-center gap-2"><span className="text-yellow-500">17%</span> <span className="text-sm font-bold text-muted-foreground lowercase">fat</span></div>
      </section>

      {/* Date Timeline */}
      <section className="pt-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[500px] px-2">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, selectedDate!)
            return (
              <button 
                key={day.toISOString()} 
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-[2rem] min-w-[80px] transition-all",
                  isToday ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/20"
                )}
              >
                <span className="text-2xl font-black">{format(day, "d")}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{format(day, "EEE")}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Goal Line Indicator */}
      <div className="relative h-px w-full bg-border border-dashed border-t-2 my-10">
        <Badge className="absolute left-0 -top-4 bg-yellow-500 text-black font-black text-xs px-3 rounded-full border-none">{calorieTarget}</Badge>
      </div>

      {/* Daily Food Report Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black tracking-tight">Daily Food Report</h2>
          </div>
          <Button variant="link" size="sm" className="text-primary font-black text-xs uppercase tracking-widest">View History</Button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {displayMeals.length > 0 ? (
            displayMeals.map((meal) => (
              <Card key={meal.id} className="rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group cursor-pointer" onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
                <CardContent className="p-0">
                  <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-secondary/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Utensils className="text-primary w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-xl tracking-tight">{meal.name}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{meal.time}</span>
                          <span className="text-[9px] px-2.5 py-1 bg-muted rounded-lg font-black text-muted-foreground uppercase tracking-wider">{meal.source}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-2">
                          <p className="font-black text-3xl tracking-tight leading-none">+{meal.calories}</p>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">kcal</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[9px] font-black text-blue-500">{meal.macros?.protein}g P</span>
                          <span className="text-[9px] font-black text-green-500">{meal.macros?.carbs}g C</span>
                          <span className="text-[9px] font-black text-yellow-500">{meal.macros?.fat}g F</span>
                        </div>
                      </div>
                      {expandedMeal === meal.id ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                    </div>
                  </div>

                  {expandedMeal === meal.id && (
                    <div className="px-8 pb-8 pt-4 border-t border-muted/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Health Benefit</p>
                            <div className="flex items-center gap-2">
                               <span className="text-2xl font-black text-primary">{meal.healthScore || 75}/100</span>
                               <Progress value={meal.healthScore || 75} className="w-24 h-1.5" />
                            </div>
                         </div>
                         <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[8px] font-black tracking-widest px-3 py-1">Balanced Choice</Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Insight</p>
                        <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">
                          "{meal.description || "This meal provides a good nutritional balance. Adding more leafy greens could further enhance its health score."}"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Ingredients</p>
                        <div className="flex flex-wrap gap-2">
                          {(meal.ingredients || ["Stir fried noodles", "Egg", "Vegetables"]).map((ing, i) => (
                            <Badge key={i} variant="secondary" className="bg-muted/50 text-muted-foreground font-bold text-[10px]">{ing}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted flex flex-col items-center justify-center">
              <Utensils className="w-24 h-24 mb-6 text-muted-foreground/20" />
              <p className="text-muted-foreground font-bold text-xl tracking-tight">No meals logged for this date.</p>
              <Button onClick={() => router.push("/record")} variant="link" className="mt-2 text-primary font-black text-lg">Start Logging Now</Button>
            </div>
          )}
        </div>
      </section>

      {/* Smart Insight Card */}
      <section className="pt-6">
        <Card className="rounded-[2.5rem] border-none bg-gradient-to-br from-primary/20 to-accent/20 shadow-xl shadow-primary/5 overflow-hidden group">
          <CardContent className="p-10 flex flex-col md:flex-row items-center gap-10 relative">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-40 h-40 text-primary" />
            </div>
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shrink-0">
              <Lightbulb className="w-12 h-12 text-primary fill-primary/10" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left z-10">
              <h2 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
                Smart Daily Insight <Badge className="bg-primary/30 text-primary-foreground font-black text-[9px] uppercase tracking-widest">AI POWERED</Badge>
              </h2>
              <p className="text-lg font-medium text-foreground/80 leading-relaxed italic max-w-2xl">"{getSuggestion()}"</p>
              <Button onClick={() => router.push("/meal-planner")} className="bg-white text-primary hover:bg-white/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg border border-primary/10">
                OPTIMIZE MY SCHEDULE <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
