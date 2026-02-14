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
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { format } from "date-fns"
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

// Standardized Macro Colors - Sharp Edition
const MACRO_COLORS = {
  protein: "hsl(var(--primary))", // Forest Green
  carbs: "hsl(38 92% 50%)",      // Amber
  fat: "hsl(var(--accent))",     // Teal
}

const SCRAPED_DATABASE = [
  { id: "s1", name: "Roasted Salmon Poke", restaurant: "Honu Poke", price: "Rp 65,000", platform: "GrabFood" as const, calories: 420, macros: { protein: 28, carbs: 45, fat: 12 }, healthScore: 95, tags: ["Healthy", "High Protein"], restricts: [] },
  { id: "s2", name: "Tempeh Quinoa Bowl", restaurant: "Vegan Vibe", price: "Rp 42,000", platform: "GoFood" as const, calories: 380, macros: { protein: 18, carbs: 55, fat: 10 }, healthScore: 98, tags: ["Vegetarian", "Vegan"], restricts: ["Vegetarian", "Vegan"] },
  { id: "s3", name: "Grilled Chicken Caesar", restaurant: "SaladStop!", price: "Rp 75,000", platform: "GrabFood" as const, calories: 450, macros: { protein: 32, carbs: 12, fat: 28 }, healthScore: 88, tags: ["High Protein"], restricts: ["Keto"] },
  { id: "s4", name: "Keto Beef Stir-fry", restaurant: "FitKitchen", price: "Rp 58,000", platform: "GoFood" as const, calories: 510, macros: { protein: 35, carbs: 8, fat: 34 }, healthScore: 90, tags: ["Keto", "Low Carb"], restricts: ["Keto", "Diabetes"] },
];

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

    toast({ title: "Schedule Synced", description: `${item.name} added to your plan.` })
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
        description: item.description || "Part of your daily curated plan.",
        expertInsight: "Daily systematic recommendation.",
        createdAt: serverTimestamp()
      })
    });

    toast({ title: "Full Day Planned", description: `All meals synced for ${dateId}.` })
    setIsMenuOpen(false)
    router.push("/")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Decision Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
        {/* Delivery Hub Trigger */}
        <Dialog open={isDeliveryOpen} onOpenChange={(open) => { setIsDeliveryOpen(open); if(open) handleCurateDelivery(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 flex flex-col items-center justify-between text-center space-y-8 active:scale-[0.98]">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0">
                 <Bike className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-2xl font-black tracking-tight uppercase text-foreground">Delivery Hub</h3>
                <p className="text-muted-foreground font-black text-xs leading-relaxed max-w-xs uppercase tracking-tight opacity-60">
                  Real-time curation from GrabFood & GoFood based on your profile.
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary text-primary-foreground">Analyze Ecosystem</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-5xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[95vh] flex flex-col">
            <DialogHeader className="bg-primary p-8 text-primary-foreground shrink-0 text-center rounded-t-[3rem]">
              <DialogTitle className="text-lg font-black uppercase tracking-widest text-center">AI Curation: Delivery Hub</DialogTitle>
            </DialogHeader>
            <div className="p-10 overflow-y-auto flex-1 no-scrollbar">
              <div className="space-y-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
                  <h2 className="font-black text-xl tracking-tight text-left w-full sm:w-auto uppercase text-foreground">Top Matches</h2>
                  <div className="flex items-center gap-4 bg-secondary rounded-full px-6 h-12 border border-border">
                    <div className="flex items-center gap-2.5 border-r border-border pr-4">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <input 
                        type="date" 
                        value={targetDate} 
                        onChange={e => setTargetDate(e.target.value)} 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-28 text-foreground" 
                      />
                    </div>
                    <div className="flex items-center gap-2.5 pl-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <input 
                        type="time" 
                        value={targetTime} 
                        onChange={e => setTargetTime(e.target.value)} 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-16 text-foreground" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Scanning Platforms...</p>
                    </div>
                  ) : deliveryResult?.map((item) => (
                    <Card key={item.id} className="rounded-[2.5rem] border border-border shadow-premium bg-white group transition-all ring-primary/10 hover:ring-8 overflow-hidden flex flex-col">
                      <CardContent className="p-8 flex flex-col h-full space-y-6">
                        <div className="space-y-5 flex-1 text-left">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest">
                              <TrendingUp className="w-4 h-4" /> {item.healthScore}% Health Rank
                            </div>
                            <h3 className="text-xl font-black tracking-tight leading-tight uppercase text-foreground">{item.name}</h3>
                            <p className="text-[11px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">{item.restaurant}</p>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="rounded-xl px-4 py-1.5 bg-primary text-primary-foreground border-none font-black text-[9px] uppercase">+{item.calories} kcal</Badge>
                            {item.tags.map((tag: string, i: number) => (
                              <Badge key={i} variant="outline" className="rounded-xl px-4 py-1.5 border-border text-muted-foreground font-black text-[9px] uppercase">{tag}</Badge>
                            ))}
                          </div>

                          <div className="bg-primary/10 p-5 rounded-[1.5rem] border border-primary/20">
                            <p className="text-[12px] font-black leading-relaxed italic text-foreground/80">"{item.reasoning}"</p>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-border space-y-6">
                          <div className="grid grid-cols-3 gap-3">
                             <div className="space-y-1 text-left">
                               <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Protein</p>
                               <p className="text-lg font-black" style={{ color: MACRO_COLORS.protein }}>{item.macros.protein}g</p>
                             </div>
                             <div className="space-y-1 text-left">
                               <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Carbs</p>
                               <p className="text-lg font-black" style={{ color: MACRO_COLORS.carbs }}>{item.macros.carbs}g</p>
                             </div>
                             <div className="space-y-1 text-left">
                               <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Fat</p>
                               <p className="text-lg font-black" style={{ color: MACRO_COLORS.fat }}>{item.macros.fat}g</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                              {item.platform === 'GrabFood' ? <Smartphone className="text-green-500 w-4 h-4" /> : <Bike className="text-emerald-500 w-4 h-4" />}
                              {item.platform}
                            </div>
                            <p className="text-2xl font-black tracking-tight text-foreground">{item.price}</p>
                          </div>

                          <Button onClick={() => handleOrderNow(item, 'delivery')} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm">Order & Sync</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smart Menu Trigger */}
        <Dialog open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if(open) handleGenerateMenu(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 flex flex-col items-center justify-between text-center space-y-8 active:scale-[0.98]">
              <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0">
                 <Sparkles className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-2xl font-black tracking-tight uppercase text-foreground">Smart Menu</h3>
                <p className="text-muted-foreground font-black text-xs leading-relaxed max-w-xs uppercase tracking-tight opacity-60">
                  Generate a randomized daily plan with seamless platform integration.
                </p>
              </div>
              <Button variant="secondary" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-sm bg-accent text-accent-foreground hover:opacity-90">Generate Plan</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[95vh] flex flex-col">
            <DialogHeader className="bg-accent p-8 text-accent-foreground shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-black uppercase tracking-widest text-left">Daily Smart Menu</DialogTitle>
              {menuPlan && !loading && (
                <Button onClick={handleAddAll} className="h-12 px-8 rounded-2xl bg-white text-accent hover:bg-white/90 font-black uppercase text-[10px] tracking-widest shadow-md">
                   <Plus className="w-4 h-4 mr-2" /> Add All to Planner
                </Button>
              )}
            </DialogHeader>
            <div className="p-10 flex-1 flex flex-col overflow-hidden no-scrollbar">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2 mb-10 shrink-0">
                <h2 className="font-black text-xl tracking-tight text-left w-full sm:w-auto uppercase text-foreground">Plan Your Day</h2>
                <div className="flex items-center gap-4 bg-secondary rounded-full px-8 h-12 border border-border">
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <input 
                      type="date" 
                      value={targetDate} 
                      onChange={e => setTargetDate(e.target.value)} 
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-32 text-foreground" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Designing Menu...</p>
                  </div>
                ) : menuPlan && (["Breakfast", "Lunch", "Dinner"] as const).map((type) => {
                  const meal = menuPlan[type];
                  return (
                    <Card key={type} className="rounded-[2.5rem] border border-border shadow-premium bg-white group transition-all ring-accent/10 hover:ring-8 overflow-hidden flex flex-col">
                      <CardContent className="p-8 flex flex-col h-full space-y-6">
                        <div className="flex-1 space-y-6 text-left">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-accent/20 text-accent-foreground uppercase text-[9px] font-black tracking-widest px-4 py-1.5 rounded-xl border-none">
                              {type}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => swapMeal(type)} className="text-muted-foreground hover:bg-secondary rounded-full h-9 w-9">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="text-base font-black tracking-tight leading-tight line-clamp-1 uppercase text-foreground">{meal.name}</h3>
                            <p className="text-[10px] font-black leading-relaxed text-muted-foreground line-clamp-2 uppercase opacity-40 tracking-tight">{meal.description}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-y border-border py-6">
                            <div className="space-y-1 text-left">
                              <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Protein</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.protein }}>{meal.macros.protein}g</p>
                            </div>
                            <div className="space-y-1 text-left">
                              <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Carbs</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.carbs }}>{meal.macros.carbs}g</p>
                            </div>
                            <div className="space-y-1 text-left">
                              <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Fat</p>
                              <p className="text-sm font-black" style={{ color: MACRO_COLORS.fat }}>{meal.macros.fat}g</p>
                            </div>
                          </div>

                          <div className="bg-secondary/50 py-4 rounded-2xl text-center border border-border/50">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Energy Target</p>
                            <p className="text-xl font-black tracking-tight text-foreground">+{meal.calories} kcal</p>
                          </div>
                        </div>

                        <div className="pt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GrabFood" }, 'menu')} className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 text-[9px] font-black uppercase tracking-widest border-none">
                              GrabFood
                            </Button>
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GoFood" }, 'menu')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-[9px] font-black uppercase tracking-widest border-none">
                              GoFood
                            </Button>
                          </div>
                          <Button onClick={() => handleOrderNow(meal, 'menu')} variant="outline" className="w-full rounded-xl h-11 text-[9px] font-black uppercase tracking-widest border-border text-muted-foreground hover:bg-secondary">
                            <Plus className="w-4 h-4 mr-2" /> Cook Myself
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
