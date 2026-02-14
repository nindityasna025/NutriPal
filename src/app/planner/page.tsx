
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Sparkles, 
  MapPin, 
  TrendingUp, 
  Smartphone, 
  Loader2,
  Bike,
  Trophy,
  Info,
  ChevronDown,
  ChevronUp,
  ChefHat,
  ShoppingBag
} from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, setDoc, increment } from "firebase/firestore"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"
import { generateDailyPlan, type GenerateDailyPlanOutput } from "@/ai/flows/generate-daily-plan"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

export default function ExplorePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // States for Delivery AI
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // States for Menu Master AI
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [aiPlan, setAiPlan] = useState<GenerateDailyPlanOutput | null>(null)

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = async () => {
    setLoadingDelivery(true)
    setAiPlan(null) // Reset other view
    try {
      const dietary = profile?.dietaryRestrictions?.join(", ") || "No specific restrictions"
      const mockDeals = "GrabFood: HealthyBowl Buy 1 Get 1, GoFood: VeganVibe Free Delivery"
      
      await curateMealSuggestions({
        dietaryPreferences: dietary,
        location: "Jakarta, Indonesia",
        availableDeals: mockDeals
      })

      setCuratedResult([
        {
          id: 1,
          name: "Organic Tofu Soba Noodles",
          calories: 380,
          price: "Rp 38,500",
          platform: "GrabFood",
          platformIcon: <Smartphone className="text-green-500 w-4 h-4" />,
          promo: "Free Delivery",
          healthScore: 92,
          distance: "0.8 km",
          macros: { protein: 18, carbs: 54, fat: 12 },
          description: "A heart-healthy choice. Soba noodles are low GI, while tofu provides complete plant-based protein.",
          ingredients: ["Soba noodles", "Organic tofu", "Broccoli", "Shitake mushrooms", "Ginger soy dressing"]
        },
        {
          id: 2,
          name: "Avocado Quinoa Salad",
          calories: 410,
          price: "Rp 45,000",
          platform: "GoFood",
          platformIcon: <Bike className="text-emerald-500 w-4 h-4" />,
          promo: "Buy 1 Get 1",
          healthScore: 98,
          distance: "2.1 km",
          macros: { protein: 12, carbs: 42, fat: 22 },
          description: "Rich in Monounsaturated fats from avocado which is great for heart health.",
          ingredients: ["White quinoa", "Ripe avocado", "Red onion", "Parsley", "Lemon zest"]
        }
      ])
    } catch (error: any) {
      console.error("AI Curation failed", error)
      toast({
        variant: "destructive",
        title: "Ecosystem Busy",
        description: "We couldn't reach the AI curator right now.",
      })
    } finally {
      setLoadingDelivery(false)
    }
  }

  const handleGenerateAiPlan = async () => {
    if (!profile) return
    setGeneratingPlan(true)
    setCuratedResult(null) // Reset other view
    try {
      const result = await generateDailyPlan({
        calorieTarget: profile.calorieTarget || 2000,
        proteinPercent: profile.proteinTarget || 30,
        carbsPercent: profile.carbsTarget || 40,
        fatPercent: profile.fatTarget || 30,
        dietType: profile.dietaryRestrictions?.[0],
        allergies: profile.allergies
      })
      setAiPlan(result)
      toast({ title: "AI Plan Ready", description: "Your optimal menu has been curated." })
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Busy", description: "Expert Nutritionist is currently offline." })
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleOrderNow = async (item: any) => {
    if (!user || !firestore) return
    const today = new Date()
    const dateId = format(today, "yyyy-MM-dd")
    const timeStr = format(today, "hh:mm a")

    try {
      const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
      const mealsColRef = collection(dailyLogRef, "meals")
      setDocumentNonBlocking(dailyLogRef, { date: dateId, caloriesConsumed: increment(item.calories) }, { merge: true })
      addDocumentNonBlocking(mealsColRef, {
        name: item.name,
        calories: item.calories,
        time: timeStr,
        source: item.platform,
        macros: item.macros,
        healthScore: item.healthScore,
        description: item.description,
        ingredients: item.ingredients,
        createdAt: serverTimestamp()
      })
      toast({ title: "Order Processed!", description: `${item.name} recorded to your dashboard.` })
      router.push("/")
    } catch (error) {
      console.error("Failed to record order", error)
    }
  }

  const handleAddAiMealToSchedule = async (meal: any, type: string, source: 'Cook' | 'Delivery') => {
    if (!user || !firestore) return
    const today = new Date()
    const dateId = format(today, "yyyy-MM-dd")
    const mealsColRef = collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals")
    
    try {
      await setDoc(doc(mealsColRef), {
        ...meal,
        type,
        source: source === 'Cook' ? 'planner' : (meal.deliveryMatch?.platform || 'GrabFood'),
        createdAt: serverTimestamp(),
        reminderEnabled: true
      })
      toast({ title: "Meal Synced", description: `${meal.name} added to your schedule.` })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Error", description: "Failed to sync meal." })
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-8 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">AI Decision Hub & Curation</p>
      </header>

      {/* Primary Selection Cards */}
      {!curatedResult && !aiPlan && (
        <section className="space-y-10">
          <h2 className="text-3xl font-black tracking-tight px-2 uppercase text-center lg:text-left">How can AI help today?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card 
              onClick={handleCurateDelivery}
              className={cn(
                "rounded-[3rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full",
                loadingDelivery && "opacity-70 pointer-events-none"
              )}
            >
              <CardContent className="p-10 flex flex-col items-center justify-between text-center space-y-8 h-full">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0">
                  {loadingDelivery ? <Loader2 className="w-12 h-12 text-primary animate-spin" /> : <Bike className="w-12 h-12 text-primary" />}
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black uppercase leading-tight">Delivery AI</h3>
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest leading-relaxed">
                    Browse health-matches from local services (Grab/Gojek).
                  </p>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary">Start Curation</Button>
              </CardContent>
            </Card>

            <Card 
              onClick={handleGenerateAiPlan}
              className={cn(
                "rounded-[3rem] bg-accent/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full",
                generatingPlan && "opacity-70 pointer-events-none"
              )}
            >
              <CardContent className="p-10 flex flex-col items-center justify-between text-center space-y-8 h-full">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0">
                  {generatingPlan ? <Loader2 className="w-12 h-12 text-accent animate-spin" /> : <Sparkles className="w-12 h-12 text-accent" />}
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black uppercase leading-tight">Menu Master AI</h3>
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest leading-relaxed">
                    Generate a full BMR-matched menu for the entire day.
                  </p>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-accent">Generate Plan</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Delivery Results */}
      {curatedResult && (
        <section className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-black text-xl uppercase tracking-tight">Top Delivery Matches</h2>
            <Button variant="ghost" onClick={() => setCuratedResult(null)} className="text-[10px] font-black uppercase tracking-widest">Back to Hub</Button>
          </div>
          
          <div className="space-y-8">
            {curatedResult.map((item, idx) => (
              <Card key={item.id} className={cn("rounded-[2.5rem] border-none shadow-premium bg-white group transition-all", idx === 0 && 'ring-4 ring-primary ring-offset-4')}>
                <CardContent className="p-0">
                  <div className="p-8 flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest"><TrendingUp className="w-4 h-4" /> {item.healthScore}% Health Score</div>
                        <h3 className="text-2xl font-black tracking-tight uppercase">{item.name}</h3>
                      </div>
                      <div className="flex gap-3">
                        <Badge className="rounded-xl px-4 py-1.5 bg-primary/10 text-primary border-none font-bold uppercase text-[9px]">+{item.calories} kcal</Badge>
                        <Badge variant="outline" className="rounded-xl px-4 py-1.5 border-primary/20 text-primary font-bold uppercase text-[9px]">{item.promo}</Badge>
                      </div>
                    </div>
                    <div className="md:text-right flex flex-col justify-between items-center md:items-end">
                      <div className="space-y-1 text-center md:text-right">
                        <p className="text-3xl font-black tracking-tighter">{item.price}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.platformIcon} {item.platform} • {item.distance}</div>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 border bg-white" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                          {expandedId === item.id ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                        <Button onClick={() => handleOrderNow(item)} className="rounded-2xl h-12 px-10 font-black uppercase text-xs tracking-widest">Order Now</Button>
                      </div>
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <div className="px-8 pb-8 pt-6 border-t border-muted/50 space-y-6 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-red-50 rounded-xl text-center"><p className="text-[9px] font-black text-red-600 uppercase">Pro</p><p className="text-xl font-black">{item.macros.protein}g</p></div>
                        <div className="p-4 bg-yellow-50 rounded-xl text-center"><p className="text-[9px] font-black text-yellow-600 uppercase">Cho</p><p className="text-xl font-black">{item.macros.carbs}g</p></div>
                        <div className="p-4 bg-blue-50 rounded-xl text-center"><p className="text-[9px] font-black text-blue-600 uppercase">Fat</p><p className="text-xl font-black">{item.macros.fat}g</p></div>
                      </div>
                      <p className="text-sm font-medium leading-relaxed italic text-foreground/80">"{item.description}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* AI Daily Plan Results */}
      {aiPlan && (
        <section className="space-y-10 animate-in zoom-in duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-black text-xl uppercase tracking-tight">AI Curated Picks</h2>
            <Button variant="ghost" onClick={() => setAiPlan(null)} className="text-[10px] font-black uppercase tracking-widest">Back to Hub</Button>
          </div>
          <Card className="rounded-[4rem] border-none shadow-premium-lg bg-white overflow-hidden">
            <CardContent className="p-10 sm:p-16 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { time: "Breakfast", data: aiPlan.breakfast },
                  { time: "Lunch", data: aiPlan.lunch },
                  { time: "Dinner", data: aiPlan.dinner }
                ].map((meal, i) => (
                  <div key={i} className="flex flex-col h-full space-y-8 p-8 bg-secondary/20 rounded-[3rem] border border-transparent hover:border-primary/20 transition-all group">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">{meal.time}</p>
                        {meal.data.deliveryMatch?.isAvailable && (
                          <Badge className="bg-green-500 text-white border-none text-[9px] font-black uppercase px-3 py-1">Delivery</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-2xl uppercase leading-tight group-hover:text-primary transition-colors">{meal.data.name}</h4>
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">+{meal.data.calories} kcal • {meal.data.macros.protein}g Protein</p>
                      </div>
                      {meal.data.deliveryMatch?.isAvailable && (
                        <div className="p-5 bg-white/70 rounded-[1.5rem] border border-green-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-green-600 mb-2 tracking-widest">Available via {meal.data.deliveryMatch.platform}</p>
                          <p className="text-[11px] font-bold truncate text-foreground">{meal.data.deliveryMatch.restaurant}</p>
                          <p className="text-[11px] font-black text-primary mt-1">{meal.data.deliveryMatch.price}</p>
                        </div>
                      )}
                      <div className="space-y-2 pt-4 border-t border-muted/50">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Swap Idea</p>
                        <p className="text-[12px] font-medium italic opacity-70 leading-relaxed">"{meal.data.swapSuggestion}"</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        onClick={() => handleAddAiMealToSchedule(meal.data, meal.time, 'Cook')} 
                        className="w-full h-12 rounded-2xl bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white font-black uppercase text-[10px] tracking-widest shadow-sm"
                      >
                        <ChefHat className="w-4 h-4 mr-2" /> Cook Myself
                      </Button>
                      {meal.data.deliveryMatch?.isAvailable && (
                        <Button 
                          onClick={() => handleAddAiMealToSchedule(meal.data, meal.time, 'Delivery')} 
                          className="w-full h-12 rounded-2xl bg-green-500 text-white hover:bg-green-600 font-black uppercase text-[10px] tracking-widest shadow-md"
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" /> Order Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
