
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
  ArrowLeft,
  Info,
  RefreshCw
} from "lucide-react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

// Custom Model: Scraped Database
const SCRAPED_DATABASE = [
  { id: "s1", name: "Roasted Salmon Poke", restaurant: "Honu Poke", price: "Rp 65,000", platform: "GrabFood" as const, calories: 420, macros: { protein: 28, carbs: 45, fat: 12 }, healthScore: 95, tags: ["Healthy", "High Protein", "Low Fat"], restricts: [] },
  { id: "s2", name: "Tempeh Quinoa Bowl", restaurant: "Vegan Vibe", price: "Rp 42,000", platform: "GoFood" as const, calories: 380, macros: { protein: 18, carbs: 55, fat: 10 }, healthScore: 98, tags: ["Vegetarian", "Vegan", "Fiber"], restricts: ["Vegetarian", "Vegan"] },
  { id: "s3", name: "Grilled Chicken Caesar", restaurant: "SaladStop!", price: "Rp 75,000", platform: "GrabFood" as const, calories: 450, macros: { protein: 32, carbs: 12, fat: 28 }, healthScore: 88, tags: ["Keto Friendly", "High Protein"], restricts: ["Keto"] },
  { id: "s4", name: "Keto Beef Stir-fry", restaurant: "FitKitchen", price: "Rp 58,000", platform: "GoFood" as const, calories: 510, macros: { protein: 35, carbs: 8, fat: 34 }, healthScore: 90, tags: ["Keto", "Low Carb", "Diabetes Friendly"], restricts: ["Keto", "Diabetes"] },
  { id: "s5", name: "Organic Tofu Curry", restaurant: "Herbivore", price: "Rp 38,000", platform: "GrabFood" as const, calories: 320, macros: { protein: 15, carbs: 35, fat: 14 }, healthScore: 92, tags: ["Vegan", "Gluten-free", "Budget"], restricts: ["Vegan", "Gluten-free"] },
  { id: "s6", name: "Lean Turkey Burger", restaurant: "Burgreens", price: "Rp 68,000", platform: "GoFood" as const, calories: 480, macros: { protein: 25, carbs: 42, fat: 18 }, healthScore: 85, tags: ["Healthy", "Clean Eating"], restricts: [] },
];

export default function ExplorePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = () => {
    if (!profile) return
    setLoadingDelivery(true)
    
    setTimeout(() => {
      const filtered = SCRAPED_DATABASE.filter(item => {
        const matchesRestrictions = profile.dietaryRestrictions?.length 
          ? profile.dietaryRestrictions.every((res: string) => item.restricts.includes(res) || item.tags.includes(res))
          : true;
        
        let fitsBmi = true;
        if (profile.bmiCategory === "Obese" || profile.bmiCategory === "Overweight") {
          fitsBmi = item.calories < 550;
        }

        return matchesRestrictions && fitsBmi;
      });

      // Pick top matches for Grab and Go
      const grabMatch = filtered.find(item => item.platform === "GrabFood");
      const goMatch = filtered.find(item => item.platform === "GoFood");

      const finalCurated = [];
      if (grabMatch) finalCurated.push({ ...grabMatch, reasoning: `Optimized for your ${profile.bmiCategory || 'Profile'}. Matches your ${profile.calorieTarget || 2000}kcal daily limit.` });
      if (goMatch) finalCurated.push({ ...goMatch, reasoning: `Tailored match for your ${profile.bmiCategory || 'Profile'}. Fits perfectly with your ${profile.calorieTarget || 2000}kcal goal.` });

      setCuratedResult(finalCurated);
      setLoadingDelivery(false);
    }, 800);
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
      healthScore: item.healthScore || 90,
      description: item.reasoning || "Balanced meal curated for your profile.",
      expertInsight: item.reasoning || "Matched to your profile goals.",
      createdAt: serverTimestamp()
    })

    const url = item.platform === 'GrabFood' 
      ? 'https://food.grab.com/' 
      : 'https://gofood.co.id'
    window.open(url, '_blank')

    toast({ title: "Order Processed", description: `${item.name} recorded.` })
    router.push("/")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60 text-center lg:text-left">AI Meal Curation by Delivery Hub</p>
      </header>

      {!curatedResult && (
        <section className="space-y-8">
          <Card 
            onClick={handleCurateDelivery}
            className={cn(
              "rounded-[2.5rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] max-w-2xl mx-auto lg:mx-0",
              loadingDelivery && "opacity-70 pointer-events-none"
            )}
          >
            <CardContent className="p-10 flex flex-col items-center justify-between text-center space-y-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
                {loadingDelivery ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <Bike className="w-10 h-10 text-primary" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase leading-tight text-center">Decision Maker</h3>
                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed text-center">
                  Compare GrabFood & GoFood matches for your profile metrics.
                </p>
              </div>
              <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary">Analyze Ecosystem</Button>
            </CardContent>
          </Card>
        </section>
      )}

      {curatedResult && (
        <section className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Top Profile Matches</h2>
            <Button variant="ghost" onClick={() => setCuratedResult(null)} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          
          <div className="space-y-6">
            {curatedResult.map((item) => (
              <Card key={item.id} className="rounded-[2rem] border-none shadow-premium bg-white group transition-all ring-primary/10 hover:ring-2 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5 text-primary font-black text-[9px] uppercase tracking-widest text-left"><TrendingUp className="w-3.5 h-3.5" /> {item.healthScore}% Health Score</div>
                        <h3 className="text-xl font-black tracking-tight uppercase text-left">{item.name}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">{item.restaurant}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-start">
                        <Badge className="rounded-xl px-3 py-1 bg-primary/10 text-primary border-none font-bold uppercase text-[8px]">+{item.calories} kcal</Badge>
                        {item.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="rounded-xl px-3 py-1 border-muted-foreground/10 text-muted-foreground font-bold uppercase text-[8px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="md:text-right flex flex-col justify-between items-center md:items-end">
                      <div className="space-y-0.5 text-center md:text-right">
                        <p className="text-2xl font-black tracking-tighter">{item.price}</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest justify-center md:justify-end">
                          {item.platform === 'GrabFood' ? <Smartphone className="text-green-500 w-4 h-4" /> : <Bike className="text-emerald-500 w-4 h-4" />}
                          {item.platform}
                        </div>
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
                    <div className="px-6 pb-6 pt-4 border-t border-muted/30 space-y-6 animate-in slide-in-from-top-1">
                      <section className="space-y-2 text-left">
                        <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest">
                          <Info className="w-3.5 h-3.5" /> AI Reasoning
                        </div>
                        <p className="text-[12px] font-medium leading-relaxed italic text-foreground/80 bg-primary/5 p-4 rounded-2xl border border-primary/10 text-left">
                          "{item.reasoning}"
                        </p>
                      </section>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[8px] font-black text-red-600 uppercase">Protein</p><p className="text-lg font-black">{item.macros.protein}g</p></div>
                        <div className="p-3 bg-amber-50 rounded-xl text-center"><p className="text-[8px] font-black text-amber-600 uppercase">Carbs</p><p className="text-lg font-black">{item.macros.carbs}g</p></div>
                        <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-[8px] font-black text-blue-600 uppercase">Fat</p><p className="text-lg font-black">{item.macros.fat}g</p></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
