
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
  AlertCircle
} from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

export default function PlannerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurate = async () => {
    setLoading(true)
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
        description: error.message?.includes("429") 
          ? "Our AI is experiencing high traffic. Please try again."
          : "We couldn't reach the AI curator right now.",
      })
    } finally {
      setLoading(false)
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-8 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">AI Meal Curation & Deals</p>
      </header>

      <section className="space-y-12">
        {!curatedResult ? (
          <Card className="border-none shadow-premium-lg overflow-hidden bg-primary text-primary-foreground text-center py-16 sm:py-20 relative rounded-[3rem] px-6">
            <CardContent className="space-y-8 relative z-10">
              <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 mx-auto animate-pulse" />
              <div className="space-y-3 px-2 sm:px-6">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Feeling Indecisive?</h2>
                <p className="text-white/80 font-medium leading-relaxed text-sm sm:text-base">Let NutriPal analyze available deals from Grab & Gojek for your macros.</p>
              </div>
              <Button onClick={handleCurate} disabled={loading} className="bg-white text-primary hover:bg-white/90 font-black h-14 sm:h-16 px-8 sm:px-16 rounded-[2rem] text-lg sm:text-xl shadow-2xl active:scale-95 transition-all w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-3" />
                    Analyzing...
                  </>
                ) : "Curate Top Picks"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-black text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest">Top Matches Found</h2>
              <Button variant="ghost" size="sm" onClick={() => setCuratedResult(null)} className="text-[10px] font-black uppercase tracking-widest hover:bg-secondary">Reset</Button>
            </div>
            
            <div className="space-y-8">
              {curatedResult.map((item, idx) => (
                <Card key={item.id} className={cn("rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg overflow-hidden relative group transition-all bg-white", idx === 0 && 'ring-4 ring-primary ring-offset-4')}>
                  {idx === 0 && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 sm:px-6 py-2 text-[9px] sm:text-[10px] font-black uppercase rounded-bl-[1.5rem] z-10">Best Match</div>}
                  <CardContent className="p-0">
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-primary font-black text-[10px] sm:text-xs uppercase tracking-widest justify-center lg:justify-start"><TrendingUp className="w-4 h-4 shrink-0" /> {item.healthScore}% Health Score</div>
                          <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-center lg:text-left leading-tight">{item.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
                          <Badge className="rounded-xl px-3 sm:px-4 py-1.5 bg-primary/10 text-primary border-none font-bold uppercase text-[8px] sm:text-[9px]">+{item.calories} kcal</Badge>
                          <Badge variant="outline" className="rounded-xl px-3 sm:px-4 py-1.5 border-primary/20 text-primary font-bold uppercase text-[8px] sm:text-[9px]">{item.promo}</Badge>
                        </div>
                      </div>
                      <div className="md:text-right flex flex-col justify-between items-center md:items-end">
                        <div className="space-y-1 text-center md:text-right">
                          <p className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{item.price}</p>
                          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest justify-center md:justify-end">{item.platformIcon} {item.platform} • {item.distance}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-6 w-full md:w-auto">
                          <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 border bg-white shadow-sm shrink-0" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                            {expandedId === item.id ? <ChevronUp /> : <ChevronDown />}
                          </Button>
                          <Button onClick={() => handleOrderNow(item)} className="flex-1 md:flex-none rounded-2xl h-12 px-6 sm:px-10 font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">Order Now</Button>
                        </div>
                      </div>
                    </div>

                    {expandedId === item.id && (
                      <div className="px-6 sm:px-8 pb-8 pt-6 border-t border-muted/50 space-y-8 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                          <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[8px] sm:text-[9px] font-black text-red-600 uppercase">Pro</p><p className="text-lg sm:text-xl font-black">{item.macros.protein}g</p></div>
                          <div className="p-3 bg-yellow-50 rounded-xl text-center"><p className="text-[8px] sm:text-[9px] font-black text-yellow-600 uppercase">Cho</p><p className="text-lg sm:text-xl font-black">{item.macros.carbs}g</p></div>
                          <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-[8px] sm:text-[9px] font-black text-blue-600 uppercase">Fat</p><p className="text-lg sm:text-xl font-black">{item.macros.fat}g</p></div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground shrink-0"><Trophy className="w-3 h-3" /> Health Score Analysis</div><span className="text-base sm:text-lg font-black text-primary shrink-0">{item.healthScore}/100</span></div>
                           <Progress value={item.healthScore} className="h-1.5" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground"><Info className="w-3 h-3" /> Nutrition Insight</div>
                          <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground/80 italic">"{item.description}"</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground">Ingredients</p>
                          <div className="flex flex-wrap gap-2">{item.ingredients.map((ing: string, i: number) => (<Badge key={i} variant="secondary" className="px-2 sm:px-3 py-1 rounded-lg font-bold text-[8px] sm:text-[9px] uppercase">{ing}</Badge>))}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
