
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  TrendingUp, 
  Smartphone, 
  Loader2,
  Bike,
  ChevronDown,
  ChevronUp,
  ChefHat,
  ShoppingBag,
  ArrowLeft
} from "lucide-react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
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
  
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [aiPlan, setAiPlan] = useState<GenerateDailyPlanOutput | null>(null)

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = async () => {
    setLoadingDelivery(true)
    setAiPlan(null)
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
      console.error(error)
      toast({ variant: "destructive", title: "AI Unavailable", description: "The Delivery AI curator is currently over capacity." })
    } finally {
      setLoadingDelivery(false)
    }
  }

  const handleGenerateAiPlan = async () => {
    if (!profile) return
    setGeneratingPlan(true)
    setCuratedResult(null)
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
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Hub Busy", description: "Daily plan generation failed. Please try again in a moment." })
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleOrderNow = async (item: any) => {
    if (!user || !firestore) return
    const today = new Date()
    const dateId = format(today, "yyyy-MM-dd")
    const timeStr = format(today, "hh:mm a")

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

    // Open the specific restaurant delivery platform in a new tab
    const url = item.platform === 'GrabFood' 
      ? 'https://food.grab.com/id/id/restaurant/lazatto-chicken-burger-citarik-jatireja-delivery/6-C3TXE2W3UA5HNN?' 
      : 'https://gofood.co.id'
    window.open(url, '_blank')

    toast({ title: "Order Processed", description: `${item.name} recorded and platform opened.` })
    router.push("/")
  }

  const handleAddAiMealToSchedule = async (meal: any, type: string, source: 'Cook' | 'Delivery') => {
    if (!user || !firestore) return
    const today = new Date()
    const dateId = format(today, "yyyy-MM-dd")
    const mealsColRef = collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals")
    
    await setDoc(doc(mealsColRef), {
      ...meal,
      type,
      source: source === 'Cook' ? 'planner' : (meal.deliveryMatch?.platform || 'GrabFood'),
      createdAt: serverTimestamp(),
      reminderEnabled: true
    })

    if (source === 'Delivery') {
      const platform = meal.deliveryMatch?.platform || 'GrabFood'
      const url = platform === 'GoFood' 
        ? 'https://gofood.co.id' 
        : 'https://food.grab.com/id/id/restaurant/lazatto-chicken-burger-citarik-jatireja-delivery/6-C3TXE2W3UA5HNN?'
      window.open(url, '_blank')
    }

    toast({ title: "Meal Synced", description: `${meal.name} added to your schedule.` })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">AI Decision Hub & Curation</p>
      </header>

      {!curatedResult && !aiPlan && (
        <section className="space-y-8">
          <h2 className="text-lg font-black tracking-tight px-1 uppercase text-left">How can AI help today?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              onClick={handleCurateDelivery}
              className={cn(
                "rounded-[2.5rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full",
                loadingDelivery && "opacity-70 pointer-events-none"
              )}
            >
              <CardContent className="p-10 flex flex-col items-center justify-between text-center space-y-6 h-full">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
                  {loadingDelivery ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <Bike className="w-10 h-10 text-primary" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase leading-tight">Delivery AI</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed">
                    Browse health-matches from local services (Grab/Gojek).
                  </p>
                </div>
                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary">Start Curation</Button>
              </CardContent>
            </Card>

            <Card 
              onClick={handleGenerateAiPlan}
              className={cn(
                "rounded-[2.5rem] bg-accent/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] h-full",
                generatingPlan && "opacity-70 pointer-events-none"
              )}
            >
              <CardContent className="p-10 flex flex-col items-center justify-between text-center space-y-6 h-full">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
                  {generatingPlan ? <Loader2 className="w-10 h-10 text-accent animate-spin" /> : <Sparkles className="w-10 h-10 text-accent" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase leading-tight">Menu Master AI</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed">
                    Generate a full BMR-matched menu for the day.
                  </p>
                </div>
                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] bg-accent">Generate Plan</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {curatedResult && (
        <section className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Top Delivery Matches</h2>
            <Button variant="ghost" onClick={() => setCuratedResult(null)} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          
          <div className="space-y-6">
            {curatedResult.map((item, idx) => (
              <Card key={item.id} className={cn("rounded-[2rem] border-none shadow-premium bg-white group transition-all", idx === 0 && 'ring-2 ring-primary ring-offset-2')}>
                <CardContent className="p-0">
                  <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-primary font-black text-[9px] uppercase tracking-widest"><TrendingUp className="w-3.5 h-3.5" /> {item.healthScore}% Health</div>
                        <h3 className="text-xl font-black tracking-tight uppercase">{item.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="rounded-xl px-3 py-1 bg-primary/10 text-primary border-none font-bold uppercase text-[8px]">+{item.calories} kcal</Badge>
                        <Badge variant="outline" className="rounded-xl px-3 py-1 border-primary/20 text-primary font-bold uppercase text-[8px]">{item.promo}</Badge>
                      </div>
                    </div>
                    <div className="md:text-right flex flex-col justify-between items-center md:items-end">
                      <div className="space-y-0.5 text-center md:text-right">
                        <p className="text-2xl font-black tracking-tighter">{item.price}</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{item.platformIcon} {item.platform} • {item.distance}</div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border bg-white" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                          {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button onClick={() => handleOrderNow(item)} className="rounded-xl h-10 px-8 font-black uppercase text-[10px] tracking-widest">Order Now</Button>
                      </div>
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <div className="px-6 pb-6 pt-4 border-t border-muted/30 space-y-4 animate-in slide-in-from-top-1">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[8px] font-black text-red-600 uppercase">Pro</p><p className="text-lg font-black">{item.macros.protein}g</p></div>
                        <div className="p-3 bg-yellow-50 rounded-xl text-center"><p className="text-[8px] font-black text-yellow-600 uppercase">Cho</p><p className="text-lg font-black">{item.macros.carbs}g</p></div>
                        <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-[8px] font-black text-blue-600 uppercase">Fat</p><p className="text-lg font-black">{item.macros.fat}g</p></div>
                      </div>
                      <p className="text-[12px] font-medium leading-relaxed italic text-foreground/80">"{item.description}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {aiPlan && (
        <section className="space-y-8 animate-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">AI Curated Picks</h2>
            <Button variant="ghost" onClick={() => setAiPlan(null)} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          <Card className="rounded-[2.5rem] border-none shadow-premium-lg bg-white overflow-hidden">
            <CardContent className="p-8 sm:p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { time: "Breakfast", data: aiPlan.breakfast },
                  { time: "Lunch", data: aiPlan.lunch },
                  { time: "Dinner", data: aiPlan.dinner }
                ].map((meal, i) => (
                  <div key={i} className="flex flex-col h-full space-y-6 p-6 bg-secondary/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all group">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase text-primary tracking-[0.3em]">{meal.time}</p>
                        {meal.data.deliveryMatch?.isAvailable && (
                          <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase px-2 py-0.5">Delivery</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-lg uppercase leading-tight group-hover:text-primary transition-colors">{meal.data.name}</h4>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+{meal.data.calories} kcal • {meal.data.macros.protein}g Protein</p>
                      </div>
                      {meal.data.deliveryMatch?.isAvailable && (
                        <div className="p-4 bg-white/70 rounded-xl border border-green-100 shadow-sm">
                          <p className="text-[8px] font-black uppercase text-green-600 mb-1 tracking-widest">{meal.data.deliveryMatch.platform}</p>
                          <p className="text-[10px] font-bold truncate text-foreground">{meal.data.deliveryMatch.restaurant}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <Button 
                        onClick={() => handleAddAiMealToSchedule(meal.data, meal.time, 'Cook')} 
                        className="w-full h-10 rounded-xl bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white font-black uppercase text-[9px] tracking-widest shadow-sm"
                      >
                        <ChefHat className="w-3.5 h-3.5 mr-2" /> Cook
                      </Button>
                      {meal.data.deliveryMatch?.isAvailable && (
                        <Button 
                          onClick={() => handleAddAiMealToSchedule(meal.data, meal.time, 'Delivery')} 
                          className="w-full h-10 rounded-xl bg-green-500 text-white hover:bg-green-600 font-black uppercase text-[9px] tracking-widest shadow-md"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-2" /> Order
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
