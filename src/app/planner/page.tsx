
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
  ChevronLeft,
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
    { name: "Avocado & Egg Toast", calories: 380, macros: { protein: 14, carbs: 28, fat: 22 }, description: "Creamy avocado on toast.", time: "08:30 AM" },
    { name: "Greek Yogurt Parfait", calories: 320, macros: { protein: 18, carbs: 35, fat: 8 }, description: "Yogurt with berries.", time: "08:30 AM" },
  ],
  Lunch: [
    { name: "Grilled Salmon Salad", calories: 450, macros: { protein: 32, carbs: 15, fat: 28 }, description: "Salmon on mixed greens.", time: "01:00 PM" },
    { name: "Quinoa Veggie Bowl", calories: 410, macros: { protein: 15, carbs: 55, fat: 12 }, description: "Quinoa with vegetables.", time: "01:00 PM" },
  ],
  Dinner: [
    { name: "Herb Roasted Chicken", calories: 510, macros: { protein: 35, carbs: 12, fat: 28 }, description: "Roasted chicken with greens.", time: "07:30 PM" },
    { name: "Baked Cod & Greens", calories: 390, macros: { protein: 28, carbs: 10, fat: 22 }, description: "Cod with steamed broccoli.", time: "07:30 PM" },
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
    
    setDocumentNonBlocking(dailyLogRef, { 
      date: dateId, 
      caloriesConsumed: increment(item.calories),
      proteinTotal: increment(item.macros?.protein || 0),
      carbsTotal: increment(item.macros?.carbs || 0),
      fatTotal: increment(item.macros?.fat || 0)
    }, { merge: true })

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
    
    const totalProtein = (menuPlan.Breakfast?.macros?.protein || 0) + 
                         (menuPlan.Lunch?.macros?.protein || 0) + 
                         (menuPlan.Dinner?.macros?.protein || 0);

    const totalCarbs = (menuPlan.Breakfast?.macros?.carbs || 0) + 
                       (menuPlan.Lunch?.macros?.carbs || 0) + 
                       (menuPlan.Dinner?.macros?.carbs || 0);

    const totalFat = (menuPlan.Breakfast?.macros?.fat || 0) + 
                     (menuPlan.Lunch?.macros?.fat || 0) + 
                     (menuPlan.Dinner?.macros?.fat || 0);

    setDocumentNonBlocking(dailyLogRef, { 
      date: dateId, 
      caloriesConsumed: increment(totalCals),
      proteinTotal: increment(totalProtein),
      carbsTotal: increment(totalCarbs),
      fatTotal: increment(totalFat)
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
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Explore</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Decision Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
        {/* Delivery Hub Trigger */}
        <Dialog open={isDeliveryOpen} onOpenChange={(open) => { setIsDeliveryOpen(open); if(open) handleCurateDelivery(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-14 flex flex-col items-center justify-between text-center space-y-10 active:scale-[0.98]">
              <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2 border-primary/10">
                 <Bike className="w-12 h-12 text-foreground" />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">Delivery Hub</h3>
                <p className="text-foreground opacity-50 font-black text-[11px] leading-relaxed max-w-xs uppercase tracking-widest">
                  Real-time curation from GrabFood & GoFood berdasarkan profil Anda.
                </p>
              </div>
              <Button className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-primary text-foreground border-none">Analyze Ecosystem</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[92vh] flex flex-col [&>button]:hidden">
            <DialogHeader className="bg-primary p-4 sm:p-5 text-foreground shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setIsDeliveryOpen(false)}
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-center flex-1">
                AI CURATION: DELIVERY HUB
              </DialogTitle>
              <div className="flex items-center gap-2 bg-white/40 rounded-full px-4 h-10 border border-white/20 shadow-sm">
                <div className="flex items-center gap-2 border-r border-foreground/10 pr-3">
                  <CalendarIcon className="w-3.5 h-3.5 text-foreground" />
                  <input 
                    type="date" 
                    value={targetDate} 
                    onChange={e => setTargetDate(e.target.value)} 
                    className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-24 text-foreground cursor-pointer" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-foreground" />
                  <input 
                    type="time" 
                    value={targetTime} 
                    onChange={e => setTargetTime(e.target.value)} 
                    className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-14 text-foreground cursor-pointer" 
                  />
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 overflow-hidden flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Scanning Platforms...</p>
                  </div>
                ) : deliveryResult?.map((item) => (
                  <Card key={item.id} className="rounded-[2.5rem] border-2 border-border shadow-premium bg-white group transition-all ring-primary/10 hover:ring-8 overflow-hidden flex flex-col">
                    <CardContent className="p-6 flex flex-col h-full space-y-4 text-left">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-accent font-black text-[9px] uppercase tracking-[0.1em]">
                            <TrendingUp className="w-4 h-4" /> {item.healthScore}% Rank
                          </div>
                          <h3 className="text-xl font-black tracking-tighter uppercase text-foreground">{item.name}</h3>
                          <p className="text-[9px] font-black text-foreground opacity-30 uppercase tracking-[0.1em]">{item.restaurant}</p>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-[1.5rem] border-2 border-primary/10">
                          <p className="text-[11px] font-black leading-tight italic text-foreground opacity-80">"{item.reasoning}"</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t-2 border-border space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                           <div className="text-center">
                             <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Protein</p>
                             <p className="text-sm font-black text-primary">{item.macros.protein}g</p>
                           </div>
                           <div className="text-center">
                             <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Carbs</p>
                             <p className="text-sm font-black text-orange-600">{item.macros.carbs}g</p>
                           </div>
                           <div className="text-center">
                             <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Fat</p>
                             <p className="text-sm font-black text-accent">{item.macros.fat}g</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[9px] font-black text-foreground opacity-40 uppercase">
                            {item.platform === 'GrabFood' ? <Smartphone className="text-green-600 w-4 h-4" /> : <Bike className="text-emerald-600 w-4 h-4" />}
                            {item.platform}
                          </div>
                          <p className="text-2xl font-black tracking-tighter text-foreground">{item.price}</p>
                        </div>
                        <Button onClick={() => handleOrderNow(item, 'delivery')} className="w-full h-12 rounded-[1rem] font-black uppercase tracking-widest text-[10px] bg-primary text-foreground border-none">Order & Sync</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smart Menu Trigger */}
        <Dialog open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if(open) handleGenerateMenu(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-14 flex flex-col items-center justify-between text-center space-y-10 active:scale-[0.98]">
              <div className="w-24 h-24 bg-accent/20 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2 border-accent/10">
                 <Sparkles className="w-12 h-12 text-foreground opacity-60" />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">Smart Menu</h3>
                <p className="text-foreground opacity-50 font-black text-[11px] leading-relaxed max-w-xs uppercase tracking-widest">
                  Generate harian dengan integrasi platform pengantaran otomatis.
                </p>
              </div>
              <Button variant="secondary" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-accent text-foreground hover:opacity-90 border-none">Generate Plan</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[92vh] flex flex-col [&>button]:hidden">
            <DialogHeader className="bg-accent p-4 sm:p-5 text-foreground shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setIsMenuOpen(false)}
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-center flex-1">
                AI CURATION: SMART MENU
              </DialogTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/40 rounded-full px-4 h-10 border border-white/20 shadow-sm">
                  <CalendarIcon className="w-3.5 h-3.5 text-foreground" />
                  <input 
                    type="date" 
                    value={targetDate} 
                    onChange={e => setTargetDate(e.target.value)} 
                    className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest focus:ring-0 w-24 text-foreground cursor-pointer" 
                  />
                </div>
                {menuPlan && !loading && (
                  <Button onClick={handleAddAll} className="h-10 px-5 rounded-[0.75rem] bg-white text-foreground hover:bg-white/90 font-black uppercase text-[9px] tracking-widest shadow-xl border-none">
                     <Plus className="w-4 h-4 mr-2" /> Add All
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="p-6 overflow-hidden flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Designing Menu...</p>
                  </div>
                ) : menuPlan && (["Breakfast", "Lunch", "Dinner"] as const).map((type) => {
                  const meal = menuPlan[type];
                  return (
                    <Card key={type} className="rounded-[2.25rem] border-2 border-border shadow-premium bg-white group transition-all ring-accent/10 hover:ring-2 overflow-hidden flex flex-col max-w-[280px] mx-auto w-full">
                      <CardContent className="p-5 flex flex-col h-full space-y-4 text-left">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-accent/20 text-foreground uppercase text-[8px] font-black tracking-widest px-3 py-1 rounded-[0.6rem] border-none">
                              {type}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => swapMeal(type)} className="text-foreground opacity-30 hover:bg-secondary rounded-full h-8 w-8 transition-all active:rotate-180">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] font-black tracking-tighter uppercase text-foreground line-clamp-1">{meal.name}</h3>
                            <p className="text-[9px] font-black leading-tight text-foreground opacity-30 line-clamp-2 uppercase tracking-tight">{meal.description}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-y border-border py-4">
                            <div className="text-center">
                              <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Protein</p>
                              <p className="text-xs font-black text-primary">{meal.macros.protein}g</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Carbs</p>
                              <p className="text-xs font-black text-orange-600">{meal.macros.carbs}g</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[7px] font-black text-foreground opacity-30 uppercase">Fat</p>
                              <p className="text-xs font-black text-accent">{meal.macros.fat}g</p>
                            </div>
                          </div>
                          <div className="bg-secondary/50 py-3 rounded-[1rem] text-center border-border">
                            <p className="text-[7px] font-black text-foreground opacity-30 uppercase tracking-[0.1em] mb-1">Energy Target</p>
                            <p className="text-xl font-black tracking-tighter text-foreground">+{meal.calories} kcal</p>
                          </div>
                        </div>
                        <div className="pt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GrabFood" }, 'menu')} className="bg-green-600 hover:bg-green-700 text-white rounded-[0.75rem] h-10 text-[8px] font-black uppercase tracking-widest border-none">
                              GrabFood
                            </Button>
                            <Button onClick={() => handleOrderNow({ ...meal, platform: "GoFood" }, 'menu')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.75rem] h-10 text-[8px] font-black uppercase tracking-widest border-none">
                              GoFood
                            </Button>
                          </div>
                          <Button onClick={() => handleOrderNow(meal, 'menu')} variant="outline" className="w-full rounded-[0.75rem] h-10 text-[8px] font-black uppercase tracking-widest border border-border text-foreground opacity-60 hover:bg-secondary shadow-sm">
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
