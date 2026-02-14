
"use client"

import { useState, useMemo } from "react"
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
  RefreshCw,
  Utensils
} from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

// Constant Macro Colors - Themed
const MACRO_COLORS = {
  protein: "hsl(var(--primary))",
  carbs: "hsl(38 92% 50%)",
  fat: "hsl(var(--accent))",
}

// Scraped Delivery Database
const SCRAPED_DATABASE = [
  { id: "s1", name: "Roasted Salmon Poke", restaurant: "Honu Poke", price: "Rp 65,000", platform: "GrabFood" as const, calories: 420, macros: { protein: 28, carbs: 45, fat: 12 }, healthScore: 95, tags: ["Healthy", "High Protein", "Low Fat"], restricts: [] },
  { id: "s2", name: "Tempeh Quinoa Bowl", restaurant: "Vegan Vibe", price: "Rp 42,000", platform: "GoFood" as const, calories: 380, macros: { protein: 18, carbs: 55, fat: 10 }, healthScore: 98, tags: ["Vegetarian", "Vegan", "Fiber"], restricts: ["Vegetarian", "Vegan"] },
  { id: "s3", name: "Grilled Chicken Caesar", restaurant: "SaladStop!", price: "Rp 75,000", platform: "GrabFood" as const, calories: 450, macros: { protein: 32, carbs: 12, fat: 28 }, healthScore: 88, tags: ["Keto Friendly", "High Protein"], restricts: ["Keto"] },
  { id: "s4", name: "Keto Beef Stir-fry", restaurant: "FitKitchen", price: "Rp 58,000", platform: "GoFood" as const, calories: 510, macros: { protein: 35, carbs: 8, fat: 34 }, healthScore: 90, tags: ["Keto", "Low Carb", "Diabetes Friendly"], restricts: ["Keto", "Diabetes"] },
  { id: "s5", name: "Organic Tofu Curry", restaurant: "Herbivore", price: "Rp 38,000", platform: "GrabFood" as const, calories: 320, macros: { protein: 15, carbs: 35, fat: 14 }, healthScore: 92, tags: ["Vegan", "Gluten-free", "Budget"], restricts: ["Vegan", "Gluten-free"] },
  { id: "s6", name: "Lean Turkey Burger", restaurant: "Burgreens", price: "Rp 68,000", platform: "GoFood" as const, calories: 480, macros: { protein: 25, carbs: 42, fat: 18 }, healthScore: 85, tags: ["Healthy", "Clean Eating"], restricts: [] },
];

// Smart Menu Template Pools
const TEMPLATE_MEALS = {
  Breakfast: [
    { name: "Avocado & Egg Toast", calories: 380, macros: { protein: 14, carbs: 28, fat: 22 }, description: "Creamy avocado on whole grain toast with a perfectly poached egg.", time: "08:30 AM" },
    { name: "Greek Yogurt Parfait", calories: 320, macros: { protein: 18, carbs: 35, fat: 8 }, description: "Rich Greek yogurt with mixed berries and honey-glazed nuts.", time: "08:30 AM" },
  ],
  Lunch: [
    { name: "Grilled Salmon Salad", calories: 450, macros: { protein: 32, carbs: 15, fat: 28 }, description: "Atlantic salmon on a bed of fresh mixed greens and light vinaigrette.", time: "01:00 PM" },
    { name: "Quinoa Veggie Bowl", calories: 410, macros: { protein: 15, carbs: 55, fat: 12 }, description: "Protein-rich quinoa with roasted seasonal vegetables and tahini.", time: "01:00 PM" },
  ],
  Dinner: [
    { name: "Herb Roasted Chicken", calories: 510, macros: { protein: 35, carbs: 12, fat: 28 }, description: "Tender roasted chicken breast with herbs and seasonal greens.", time: "07:30 PM" },
    { name: "Baked Cod & Greens", calories: 390, macros: { protein: 28, carbs: 10, fat: 22 }, description: "Lean cod fillet baked with lemon and served with steamed broccoli.", time: "07:30 PM" },
  ]
};

export default function ExplorePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [view, setView] = useState<"hub" | "delivery" | "menu">("hub")
  const [loading, setLoading] = useState(false)
  const [deliveryResult, setDeliveryResult] = useState<any[] | null>(null)
  const [menuPlan, setMenuPlan] = useState<any | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = () => {
    setLoading(true)
    setView("delivery")
    setTimeout(() => {
      const filtered = SCRAPED_DATABASE.filter(item => {
        if (!profile) return true;
        const matchesRestrictions = profile.dietaryRestrictions?.length 
          ? profile.dietaryRestrictions.every((res: string) => item.restricts.includes(res) || item.tags.includes(res))
          : true;
        let fitsBmi = true;
        if (profile.bmiCategory === "Obese" || profile.bmiCategory === "Overweight") fitsBmi = item.calories < 550;
        return matchesRestrictions && fitsBmi;
      });

      const grabMatch = filtered.find(item => item.platform === "GrabFood");
      const goMatch = filtered.find(item => item.platform === "GoFood");

      const final = [];
      if (grabMatch) final.push({ ...grabMatch, reasoning: "Optimized for your profile metrics and daily caloric budget." });
      if (goMatch) final.push({ ...goMatch, reasoning: "Tailored healthy match from the GoFood ecosystem." });

      setDeliveryResult(final);
      setLoading(false);
    }, 800);
  }

  const handleGenerateMenu = () => {
    setLoading(true)
    setView("menu")
    setTimeout(() => {
      const plan = {
        Breakfast: TEMPLATE_MEALS.Breakfast[Math.floor(Math.random() * TEMPLATE_MEALS.Breakfast.length)],
        Lunch: TEMPLATE_MEALS.Lunch[Math.floor(Math.random() * TEMPLATE_MEALS.Lunch.length)],
        Dinner: TEMPLATE_MEALS.Dinner[Math.floor(Math.random() * TEMPLATE_MEALS.Dinner.length)],
      };
      setMenuPlan(plan);
      setLoading(false);
    }, 1000);
  }

  const swapMeal = (type: "Breakfast" | "Lunch" | "Dinner") => {
    const pool = TEMPLATE_MEALS[type];
    let nextMeal;
    do {
      nextMeal = pool[Math.floor(Math.random() * pool.length)];
    } while (nextMeal.name === menuPlan[type].name && pool.length > 1);
    
    setMenuPlan({ ...menuPlan, [type]: nextMeal });
    toast({ title: `${type} Swapped`, description: "A fresh option has been curated." });
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
      source: item.platform || "planner",
      macros: item.macros,
      healthScore: item.healthScore || 90,
      description: item.description || item.reasoning || "Balanced meal curated for your profile.",
      expertInsight: item.reasoning || "Matched to your profile goals.",
      createdAt: serverTimestamp()
    })

    if (item.platform) {
      const url = item.platform === 'GrabFood' ? 'https://food.grab.com/' : 'https://gofood.co.id'
      window.open(url, '_blank')
    }

    toast({ title: "Order/Sync Processed", description: `${item.name} recorded.` })
    router.push("/")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">AI Decision Hub</p>
      </header>

      {view === "hub" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Card onClick={handleCurateDelivery} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-10 flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
               <Bike className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase leading-tight">Delivery Hub</h3>
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed">
                Compare GrabFood & GoFood matches for your profile.
              </p>
            </div>
            <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary">Analyze Ecosystem</Button>
          </Card>

          <Card onClick={handleGenerateMenu} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-10 flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
               <Sparkles className="w-10 h-10 text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase leading-tight">Smart Menu</h3>
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed">
                Generate a randomized daily plan with delivery sync.
              </p>
            </div>
            <Button variant="secondary" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px]">Generate Plan</Button>
          </Card>
        </div>
      )}

      {view === "delivery" && (
        <section className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Top Profile Matches</h2>
            <Button variant="ghost" onClick={() => setView("hub")} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : deliveryResult?.map((item) => (
              <Card key={item.id} className="rounded-[2rem] border-none shadow-premium bg-white group transition-all ring-primary/10 hover:ring-2 overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-1.5 text-primary font-black text-[9px] uppercase tracking-widest"><TrendingUp className="w-3.5 h-3.5" /> {item.healthScore}% Health Score</div>
                      <h3 className="text-xl font-black tracking-tight uppercase">{item.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.restaurant}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="rounded-xl px-3 py-1 bg-primary/10 text-primary border-none font-bold uppercase text-[8px]">+{item.calories} kcal</Badge>
                      {item.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="rounded-xl px-3 py-1 border-muted-foreground/10 text-muted-foreground font-bold uppercase text-[8px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="md:text-right flex flex-col justify-between items-center md:items-end">
                    <div className="space-y-0.5 text-center md:text-right">
                      <p className="text-2xl font-black tracking-tighter">{item.price}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        {item.platform === 'GrabFood' ? <Smartphone className="text-green-500 w-4 h-4" /> : <Bike className="text-emerald-500 w-4 h-4" />}
                        {item.platform}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => handleOrderNow(item)} className="rounded-xl h-10 px-8 font-black uppercase text-[10px] tracking-widest">Order Now</Button>
                    </div>
                  </div>
                  {expandedId === item.id && (
                    <div className="w-full pt-4 border-t border-muted/30 mt-4 space-y-4 text-left">
                      <p className="text-[12px] font-medium leading-relaxed italic bg-primary/5 p-4 rounded-xl border border-primary/10">"{item.reasoning}"</p>
                      <div className="grid grid-cols-3 gap-3">
                         <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[8px] font-black text-red-600 uppercase">Protein</p><p className="font-black">{item.macros.protein}g</p></div>
                         <div className="p-3 bg-amber-50 rounded-xl text-center"><p className="text-[8px] font-black text-amber-600 uppercase">Carbs</p><p className="font-black">{item.macros.carbs}g</p></div>
                         <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-[8px] font-black text-blue-600 uppercase">Fat</p><p className="font-black">{item.macros.fat}g</p></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {view === "menu" && menuPlan && (
        <section className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Matched Menu Templates</h2>
            <Button variant="ghost" onClick={() => setView("hub")} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>

          <div className="space-y-6">
            {(["Breakfast", "Lunch", "Dinner"] as const).map((type) => {
              const meal = menuPlan[type];
              return (
                <Card key={type} className="rounded-[2rem] border-none shadow-premium bg-white overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                       <div className="flex-1 space-y-6">
                         <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-[0.2em] px-3 py-1 rounded-lg">
                              {type}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => swapMeal(type)} className="text-muted-foreground hover:bg-secondary rounded-full h-10 w-10">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                         </div>
                         <div className="space-y-2 text-left">
                            <h3 className="text-2xl font-black uppercase tracking-tight">{meal.name}</h3>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">{meal.description}</p>
                         </div>
                         <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-0.5"><p className="text-[8px] font-black text-muted-foreground uppercase">Protein</p><p className="text-lg font-black" style={{ color: MACRO_COLORS.protein }}>{meal.macros.protein}g</p></div>
                            <div className="space-y-0.5"><p className="text-[8px] font-black text-muted-foreground uppercase">Carbs</p><p className="text-lg font-black" style={{ color: MACRO_COLORS.carbs }}>{meal.macros.carbs}g</p></div>
                            <div className="space-y-0.5"><p className="text-[8px] font-black text-muted-foreground uppercase">Fat</p><p className="text-lg font-black" style={{ color: MACRO_COLORS.fat }}>{meal.macros.fat}g</p></div>
                         </div>
                       </div>
                       <div className="w-full md:w-64 space-y-4">
                          <div className="bg-secondary/30 p-5 rounded-2xl text-center space-y-1">
                             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Target Energy</p>
                             <p className="text-2xl font-black tracking-tighter">+{meal.calories} kcal</p>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                             <Button onClick={() => handleOrderNow({ ...meal, platform: "GrabFood" })} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 text-[9px] font-black uppercase tracking-widest gap-2">
                               Order via Grab
                             </Button>
                             <Button onClick={() => handleOrderNow({ ...meal, platform: "GoFood" })} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-[9px] font-black uppercase tracking-widest gap-2">
                               Order via GoFood
                             </Button>
                             <Button onClick={() => handleOrderNow(meal)} variant="outline" className="w-full rounded-xl h-11 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary">
                               Cook Myself
                             </Button>
                          </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  )
}
