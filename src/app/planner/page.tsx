
"use client"

import { useState, useEffect } from "react"
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
  ChefHat,
  ArrowLeft,
  RefreshCw,
  Utensils,
  ChevronRight,
  Target,
  Calendar as CalendarIcon,
  Clock,
  X,
  Plus,
  CheckCircle2
} from "lucide-react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { format, startOfToday } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Standardized Macro Colors
const MACRO_COLORS = {
  protein: "hsl(var(--primary))", // Forest Green
  carbs: "hsl(38 92% 50%)",      // Amber
  fat: "hsl(var(--accent))",     // Teal
}

// Scraped Delivery Database (Mocked for Demo)
const SCRAPED_DATABASE = [
  { id: "s1", name: "Roasted Salmon Poke", restaurant: "Honu Poke", price: "Rp 65,000", platform: "GrabFood" as const, calories: 420, macros: { protein: 28, carbs: 45, fat: 12 }, healthScore: 95, tags: ["Healthy", "High Protein"], restricts: [] },
  { id: "s2", name: "Tempeh Quinoa Bowl", restaurant: "Vegan Vibe", price: "Rp 42,000", platform: "GoFood" as const, calories: 380, macros: { protein: 18, carbs: 55, fat: 10 }, healthScore: 98, tags: ["Vegetarian", "Vegan"], restricts: ["Vegetarian", "Vegan"] },
  { id: "s3", name: "Grilled Chicken Caesar", restaurant: "SaladStop!", price: "Rp 75,000", platform: "GrabFood" as const, calories: 450, macros: { protein: 32, carbs: 12, fat: 28 }, healthScore: 88, tags: ["High Protein"], restricts: ["Keto"] },
  { id: "s4", name: "Keto Beef Stir-fry", restaurant: "FitKitchen", price: "Rp 58,000", platform: "GoFood" as const, calories: 510, macros: { protein: 35, carbs: 8, fat: 34 }, healthScore: 90, tags: ["Keto", "Low Carb"], restricts: ["Keto", "Diabetes"] },
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
  
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [deliveryResult, setDeliveryResult] = useState<any[] | null>(null)
  const [menuPlan, setMenuPlan] = useState<any | null>(null)
  
  const [targetDate, setTargetDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [targetTime, setTargetTime] = useState<string>(format(new Date(), "HH:mm"))

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = () => {
    setLoading(true)
    setDeliveryResult(null)
    setTimeout(() => {
      const filtered = SCRAPED_DATABASE.filter(item => {
        if (!profile) return true;
        const matchesRestrictions = profile.dietaryRestrictions?.length 
          ? profile.dietaryRestrictions.every((res: string) => item.restricts.includes(res))
          : true;
        return matchesRestrictions;
      });

      const grabMatch = filtered.find(item => item.platform === "GrabFood") || SCRAPED_DATABASE.find(item => item.platform === "GrabFood");
      const goMatch = filtered.find(item => item.platform === "GoFood") || SCRAPED_DATABASE.find(item => item.platform === "GoFood");

      setDeliveryResult([
        { ...grabMatch, reasoning: "Top GrabFood match for your target." },
        { ...goMatch, reasoning: "Optimal healthy choice via GoFood." }
      ].filter(Boolean));
      setLoading(false);
    }, 800);
  }

  const handleGenerateMenu = () => {
    setLoading(true)
    setMenuPlan(null)
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
    if (!menuPlan) return;
    const pool = TEMPLATE_MEALS[type];
    let nextMeal;
    do {
      nextMeal = pool[Math.floor(Math.random() * pool.length)];
    } while (nextMeal.name === menuPlan[type].name && pool.length > 1);
    
    setMenuPlan({ ...menuPlan, [type]: nextMeal });
    toast({ title: `${type} Swapped`, description: "A new systematic choice has been generated." });
  }

  const handleOrderNow = async (item: any, source: 'delivery' | 'menu') => {
    if (!user || !firestore) return
    const dateId = targetDate || format(new Date(), "yyyy-MM-dd")
    
    let finalTime = item.time || "12:00 PM"
    
    if (source === 'delivery' && targetTime) {
      const [hours, mins] = targetTime.split(':')
      const h = parseInt(hours)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      finalTime = `${h12}:${mins} ${ampm}`
    }

    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealsColRef = collection(dailyLogRef, "meals")
    
    setDocumentNonBlocking(dailyLogRef, { date: dateId, caloriesConsumed: increment(item.calories) }, { merge: true })
    addDocumentNonBlocking(mealsColRef, {
      name: item.name,
      calories: item.calories,
      time: finalTime,
      source: item.platform || "planner",
      macros: item.macros,
      healthScore: item.healthScore || 90,
      description: item.description || item.reasoning || "Balanced choice curated for your profile.",
      expertInsight: item.reasoning || "Matched to your profile goals.",
      createdAt: serverTimestamp()
    })

    if (item.platform) {
      const url = item.platform === 'GrabFood' ? 'https://food.grab.com/' : 'https://gofood.co.id'
      window.open(url, '_blank')
    }

    toast({ title: "Schedule Synced", description: `${item.name} added to your plan for ${dateId}.` })
    
    setIsDeliveryOpen(false)
    setIsMenuOpen(false)
    router.push("/")
  }

  const handleAddAll = async () => {
    if (!user || !firestore || !menuPlan) return
    const dateId = targetDate || format(new Date(), "yyyy-MM-dd")
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealsColRef = collection(dailyLogRef, "meals")
    
    const totalCals = (menuPlan.Breakfast?.calories || 0) + 
                      (menuPlan.Lunch?.calories || 0) + 
                      (menuPlan.Dinner?.calories || 0);

    setDocumentNonBlocking(dailyLogRef, { 
      date: dateId, 
      caloriesConsumed: increment(totalCals) 
    }, { merge: true })

    const types = ["Breakfast", "Lunch", "Dinner"] as const;
    types.forEach(type => {
      const item = menuPlan[type];
      addDocumentNonBlocking(mealsColRef, {
        name: item.name,
        calories: item.calories,
        time: item.time,
        source: "planner",
        macros: item.macros,
        healthScore: 90,
        description: item.description || "Part of your AI-generated daily plan.",
        expertInsight: "Curated daily systematic choice.",
        createdAt: serverTimestamp()
      })
    });

    toast({ 
      title: "Full Day Scheduled", 
      description: `All 3 meals have been added to your record for ${dateId}.` 
    })
    
    setIsMenuOpen(false)
    router.push("/")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Smart Decision Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <Dialog open={isDeliveryOpen} onOpenChange={(open) => { setIsDeliveryOpen(open); if(open) handleCurateDelivery(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 flex flex-col items-center justify-between text-center space-y-8 active:scale-[0.98]">
              <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
                 <Bike className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase leading-tight">Delivery Hub</h3>
                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed max-w-xs">
                  Compare GrabFood &amp; GoFood matches for your profile metrics.
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary shadow-lg shadow-primary/20">Analyze Ecosystem</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-5xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white/95 backdrop-blur-sm w-[94vw] md:left-[calc(50%+8rem)] max-h-[95vh] flex flex-col">
            <DialogHeader className="bg-primary p-6 text-primary-foreground shrink-0 text-center relative rounded-t-[3rem]">
              <DialogTitle className="text-xl font-black uppercase tracking-widest text-center">AI Meal Curation by Delivery Hub</DialogTitle>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                  <h2 className="font-black text-lg uppercase tracking-tight text-left w-full sm:w-auto">Top Profile Matches</h2>
                  <div className="flex items-center gap-3 bg-secondary/50 rounded-full px-5 h-10 border border-primary/10 shadow-inner">
                    <div className="flex items-center gap-2 border-r border-muted/30 pr-3">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <input 
                        type="date" 
                        value={targetDate} 
                        onChange={e => setTargetDate(e.target.value)} 
                        className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-26" 
                      />
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <input 
                        type="time" 
                        value={targetTime} 
                        onChange={e => setTargetTime(e.target.value)} 
                        className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-16" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 space-y-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Analyzing Ecosystem...</p>
                    </div>
                  ) : deliveryResult?.map((item) => (
                    <Card key={item.id} className="rounded-[2.5rem] border-none shadow-premium bg-white group transition-all ring-primary/5 hover:ring-4 overflow-hidden flex flex-col active:scale-[0.99]">
                      <CardContent className="p-6 flex flex-col h-full space-y-4">
                        <div className="space-y-4 flex-1 text-left">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest">
                              <TrendingUp className="w-3.5 h-3.5" /> {item.healthScore}% Health Score
                            </div>
                            <h3 className="text-xl font-black tracking-tight uppercase leading-tight">{item.name}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.restaurant}</p>
                          </div>
                          
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge className="rounded-xl px-3 py-1 bg-primary/10 text-primary border-none font-black uppercase text-[8px]">+{item.calories} kcal</Badge>
                            {item.tags.map((tag: string, i: number) => (
                              <Badge key={i} variant="outline" className="rounded-xl px-3 py-1 border-muted-foreground/10 text-muted-foreground font-black uppercase text-[8px]">{tag}</Badge>
                            ))}
                          </div>

                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <p className="text-[10px] font-medium leading-relaxed italic text-muted-foreground text-left">"{item.reasoning}"</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-muted/20 space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                             <div className="space-y-0.5 text-left">
                               <p className="text-[8px] font-black text-muted-foreground uppercase">Protein</p>
                               <p className="text-base font-black" style={{ color: MACRO_COLORS.protein }}>{item.macros.protein}g</p>
                             </div>
                             <div className="space-y-0.5 text-left">
                               <p className="text-[8px] font-black text-muted-foreground uppercase">Carbs</p>
                               <p className="text-base font-black" style={{ color: MACRO_COLORS.carbs }}>{item.macros.carbs}g</p>
                             </div>
                             <div className="space-y-0.5 text-left">
                               <p className="text-[8px] font-black text-muted-foreground uppercase">Fat</p>
                               <p className="text-base font-black" style={{ color: MACRO_COLORS.fat }}>{item.macros.fat}g</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              {item.platform === 'GrabFood' ? <Smartphone className="text-green-500 w-4 h-4" /> : <Bike className="text-emerald-500 w-4 h-4" />}
                              {item.platform}
                            </div>
                            <p className="text-xl font-black tracking-tighter">{item.price}</p>
                          </div>

                          <Button onClick={() => handleOrderNow(item, 'delivery')} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-premium">Order &amp; Sync</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if(open) handleGenerateMenu(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 flex flex-col items-center justify-between text-center space-y-8 active:scale-[0.98]">
              <div className="w-24 h-24 bg-accent/10 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-premium shrink-0">
                 <Sparkles className="w-12 h-12 text-accent" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase leading-tight">Smart Menu</h3>
                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed max-w-xs">
                  Generate a randomized daily plan with platform sync.
                </p>
              </div>
              <Button variant="secondary" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/10">Generate Plan</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white/95 backdrop-blur-sm w-[94vw] md:left-[calc(50%+8rem)] max-h-[95vh] flex flex-col">
            <DialogHeader className="bg-accent p-6 text-accent-foreground shrink-0 text-center rounded-t-[3rem] flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-black uppercase tracking-widest text-left">Smart Menu Generation</DialogTitle>
              {menuPlan && !loading && (
                <Button onClick={handleAddAll} className="h-10 px-6 rounded-xl bg-white text-accent hover:bg-white/90 font-black uppercase text-[10px] tracking-widest shadow-md">
                   <Plus className="w-4 h-4 mr-2" /> Add All to Planner
                </Button>
              )}
            </DialogHeader>
            <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 mb-4 shrink-0">
                <h2 className="font-black text-lg uppercase tracking-tight text-left w-full sm:w-auto">Matched Menu Templates</h2>
                <div className="flex items-center gap-3 bg-secondary/50 rounded-full px-6 h-10 border border-primary/10 shadow-inner">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    <input 
                      type="date" 
                      value={targetDate} 
                      onChange={e => setTargetDate(e.target.value)} 
                      className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-30" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-accent" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Curating Daily Plan...</p>
                  </div>
                ) : menuPlan && (["Breakfast", "Lunch", "Dinner"] as const).map((type) => {
                  const meal = menuPlan[type];
                  return (
                    <Card key={type} className="rounded-[2rem] border-none shadow-premium bg-white group transition-all ring-primary/5 hover:ring-2 overflow-hidden flex flex-col">
                      <CardContent className="p-4 sm:p-5 flex flex-col h-full space-y-3">
                        <div className="flex-1 space-y-3 text-left">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-primary/10 text-primary uppercase text-[8px] font-black tracking-[0.2em] px-2 py-0.5 rounded-lg">
                              {type}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => swapMeal(type)} className="text-muted-foreground hover:bg-secondary rounded-full h-7 w-7">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          
                          <div className="space-y-0.5">
                            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase leading-tight line-clamp-1">{meal.name}</h3>
                            <p className="text-[9px] font-medium leading-relaxed text-muted-foreground line-clamp-2">{meal.description}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-1 border-y border-muted/20 py-3">
                            <div className="space-y-0.5 text-left">
                              <p className="text-[7px] font-black text-muted-foreground uppercase">Protein</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.protein }}>{meal.macros.protein}g</p>
                            </div>
                            <div className="space-y-0.5 text-left">
                              <p className="text-[7px] font-black text-muted-foreground uppercase">Carbs</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.carbs }}>{meal.macros.carbs}g</p>
                            </div>
                            <div className="space-y-0.5 text-left">
                              <p className="text-[7px] font-black text-muted-foreground uppercase">Fat</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.fat }}>{meal.macros.fat}g</p>
                            </div>
                          </div>

                          <div className="bg-secondary/20 py-2 rounded-xl text-center">
                            <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Energy</p>
                            <p className="text-lg font-black tracking-tighter text-foreground">+{meal.calories} kcal</p>
                          </div>
                        </div>

                        <div className="pt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GrabFood" }, 'menu')} className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 text-[7px] font-black uppercase tracking-widest">
                              GrabFood
                            </Button>
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GoFood" }, 'menu')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 text-[7px] font-black uppercase tracking-widest">
                              GoFood
                            </Button>
                          </div>
                          <Button onClick={() => handleOrderNow(meal, 'menu')} variant="outline" className="w-full rounded-lg h-8 text-[7px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5">
                            <Plus className="w-3 h-3 mr-1" /> Cook Myself
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
