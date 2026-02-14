
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
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

// Alternative Pools for Swapping
const ALTERNATIVE_POOL = {
  standard: {
    Breakfast: [
      { name: "Berry Oat Smoothie Bowl", calories: 350, macros: { protein: 12, carbs: 65, fat: 8 }, description: "Antioxidant-rich base with flax seeds.", ingredients: ["Oats", "Mixed Berries", "Almond Milk"] },
      { name: "Avocado & Egg Sourdough", calories: 380, macros: { protein: 16, carbs: 40, fat: 22 }, description: "High-protein breakfast for sustained energy.", ingredients: ["Sourdough", "Avocado", "Poached Egg"] },
      { name: "Greek Yogurt Parfait", calories: 310, macros: { protein: 20, carbs: 35, fat: 6 }, description: "Low-fat, high-protein probiotic start.", ingredients: ["Greek Yogurt", "Granola", "Honey"] }
    ],
    Lunch: [
      { name: "Mediterranean Chicken Wrap", calories: 550, macros: { protein: 35, carbs: 45, fat: 22 }, description: "Grilled lean chicken with hummus and greens.", ingredients: ["Chicken breast", "Whole wheat wrap", "Hummus"] },
      { name: "Steak & Quinoa Power Bowl", calories: 620, macros: { protein: 42, carbs: 50, fat: 28 }, description: "Lean sirloin with complex grains.", ingredients: ["Sirloin", "Quinoa", "Spinach"] },
      { name: "Miso Glazed Salmon Bowl", calories: 580, macros: { protein: 34, carbs: 55, fat: 24 }, description: "Rich Omega-3s with brown rice.", ingredients: ["Salmon", "Brown Rice", "Edamame"] }
    ],
    Dinner: [
      { name: "Baked Cod with Asparagus", calories: 420, macros: { protein: 40, carbs: 10, fat: 24 }, description: "Omega-3 dense white fish with steamed greens.", ingredients: ["Cod fillet", "Asparagus", "Lemon"] },
      { name: "Lemon Herb Roast Turkey", calories: 480, macros: { protein: 38, carbs: 20, fat: 18 }, description: "Ultra-lean poultry with roasted roots.", ingredients: ["Turkey Breast", "Sweet Potato", "Broccoli"] },
      { name: "Lean Beef Stir-fry", calories: 510, macros: { protein: 35, carbs: 30, fat: 22 }, description: "Snap peas and lean beef in light soy.", ingredients: ["Beef Strips", "Snap Peas", "Bell Peppers"] }
    ]
  },
  vegetarian: {
    Breakfast: [
      { name: "Tofu Scramble with Spinach", calories: 320, macros: { protein: 22, carbs: 10, fat: 18 }, description: "Plant-based protein packed with iron.", ingredients: ["Tofu", "Spinach", "Turmeric"] },
      { name: "Almond Butter & Banana Toast", calories: 360, macros: { protein: 10, carbs: 45, fat: 18 }, description: "Potassium-rich start with healthy fats.", ingredients: ["Whole grain toast", "Almond Butter", "Banana"] },
      { name: "Chia Seed Pudding", calories: 290, macros: { protein: 12, carbs: 35, fat: 14 }, description: "Fiber-dense meal for long satiety.", ingredients: ["Chia Seeds", "Coconut Milk", "Mango"] }
    ],
    Lunch: [
      { name: "Lentil & Sweet Potato Stew", calories: 480, macros: { protein: 18, carbs: 75, fat: 6 }, description: "Slow-burning complex carbs for sustained energy.", ingredients: ["Lentils", "Sweet Potato", "Carrots"] },
      { name: "Falafel & Hummus Plate", calories: 520, macros: { protein: 22, carbs: 60, fat: 24 }, description: "Classic Middle-Eastern plant power.", ingredients: ["Falafel", "Hummus", "Tabbouleh"] },
      { name: "Roasted Veggie Pasta", calories: 490, macros: { protein: 15, carbs: 80, fat: 12 }, description: "Whole wheat pasta with seasonal greens.", ingredients: ["Whole Wheat Pasta", "Zucchini", "Bell Peppers"] }
    ],
    Dinner: [
      { name: "Mushroom Risotto", calories: 510, macros: { protein: 14, carbs: 85, fat: 12 }, description: "Savory wild mushrooms over arborio rice.", ingredients: ["Mushrooms", "Rice", "Parmesan"] },
      { name: "Black Bean Quinoa Tacos", calories: 450, macros: { protein: 18, carbs: 65, fat: 15 }, description: "Mexican-inspired protein duo.", ingredients: ["Black Beans", "Quinoa", "Corn Tortillas"] },
      { name: "Grilled Halloumi Salad", calories: 540, macros: { protein: 24, carbs: 12, fat: 42 }, description: "Mediterranean classic with balsamic glaze.", ingredients: ["Halloumi", "Arugula", "Cherry Tomatoes"] }
    ]
  }
};

export default function ExplorePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [aiPlan, setAiPlan] = useState<any | null>(null)

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = () => {
    if (!profile) return
    setLoadingDelivery(true)
    setAiPlan(null)
    
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
      }).map(item => ({
        ...item,
        reasoning: `Matched to your ${profile.bmiCategory || 'Profile'} category. This meal optimizes your ${profile.calorieTarget || 2000}kcal daily limit.`
      }));

      setCuratedResult(filtered.slice(0, 3));
      setLoadingDelivery(false);
    }, 800);
  }

  const handleGenerateAiPlan = () => {
    if (!profile) return
    setGeneratingPlan(true)
    setCuratedResult(null)
    
    setTimeout(() => {
      const isVeggie = profile.dietaryRestrictions?.includes("Vegetarian");
      const pool = isVeggie ? ALTERNATIVE_POOL.vegetarian : ALTERNATIVE_POOL.standard;
      
      setAiPlan({
        Breakfast: { ...pool.Breakfast[0], deliveryMatch: { isAvailable: false } },
        Lunch: { ...pool.Lunch[0], deliveryMatch: { isAvailable: true, platform: "GrabFood", restaurant: "NutriKitchen", price: "Rp 55,000" } },
        Dinner: { ...pool.Dinner[0], deliveryMatch: { isAvailable: true, platform: "GoFood", restaurant: "HealthGlow", price: "Rp 62,000" } }
      });
      setGeneratingPlan(false);
    }, 1000);
  }

  const handleSwapMeal = (type: string) => {
    if (!profile || !aiPlan) return;
    const isVeggie = profile.dietaryRestrictions?.includes("Vegetarian");
    const pool = (isVeggie ? ALTERNATIVE_POOL.vegetarian : ALTERNATIVE_POOL.standard)[type as keyof typeof ALTERNATIVE_POOL.standard];
    
    const currentMealName = aiPlan[type].name;
    const alternatives = pool.filter(m => m.name !== currentMealName);
    const nextMeal = alternatives[Math.floor(Math.random() * alternatives.length)];
    
    setAiPlan((prev: any) => ({
      ...prev,
      [type]: { 
        ...nextMeal, 
        deliveryMatch: { 
          isAvailable: Math.random() > 0.4, 
          platform: Math.random() > 0.5 ? "GrabFood" : "GoFood", 
          restaurant: "Alternative Kitchen", 
          price: "Rp 58,000" 
        } 
      }
    }));
    
    toast({ title: "Meal Swapped", description: `${nextMeal.name} is now suggested for ${type}.` });
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
      description: item.reasoning || item.description || "Balanced meal curated for your profile.",
      expertInsight: item.reasoning || item.description || "Matched to your profile goals.",
      createdAt: serverTimestamp()
    })

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
    
    const timeMap: Record<string, string> = { 
      "Breakfast": "08:30 AM", 
      "Lunch": "01:00 PM", 
      "Dinner": "07:30 PM" 
    };
    const mealTime = timeMap[type] || "12:00 PM";

    const newDocRef = doc(mealsColRef);
    setDocumentNonBlocking(newDocRef, {
      name: meal.name,
      calories: meal.calories,
      macros: meal.macros,
      description: meal.description || meal.reasoning || "Personalized meal recommendation.",
      expertInsight: meal.reasoning || meal.description || "Optimized for your current health metrics.",
      ingredients: meal.ingredients || [],
      type,
      time: mealTime,
      source: source === 'Cook' ? 'planner' : (meal.deliveryMatch?.platform || 'GrabFood'),
      createdAt: serverTimestamp(),
      reminderEnabled: true,
      healthScore: meal.healthScore || 90
    }, { merge: true })

    if (source === 'Delivery') {
      const platform = meal.deliveryMatch?.platform || 'GrabFood'
      const url = platform === 'GoFood' 
        ? 'https://gofood.co.id' 
        : 'https://food.grab.com/id/id/restaurant/lazatto-chicken-burger-citarik-jatireja-delivery/6-C3TXE2W3UA5HNN?'
      window.open(url, '_blank')
    }

    toast({ title: "Meal Synced", description: `${meal.name} added to your schedule at ${mealTime}.` })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Explore</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60 text-center lg:text-left">Smart Decision Hub</p>
      </header>

      {!curatedResult && !aiPlan && (
        <section className="space-y-8">
          <h2 className="text-lg font-black tracking-tight px-1 uppercase text-left">Ecosystem Curation</h2>
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
                  <h3 className="text-2xl font-black uppercase leading-tight text-center">Delivery Hub</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed text-center">
                    Filter ecosystem matches for your unique profile metrics.
                  </p>
                </div>
                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary">Start Decision Maker</Button>
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
                  <h3 className="text-2xl font-black uppercase leading-tight text-center">Smart Menu</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed text-center">
                    Instant BMR-matched menu for today&apos;s recovery.
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
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Top Profile Matches</h2>
            <Button variant="ghost" onClick={() => setCuratedResult(null)} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          
          <div className="space-y-6">
            {curatedResult.map((item) => (
              <Card key={item.id} className="rounded-[2rem] border-none shadow-premium bg-white group transition-all ring-primary/10 hover:ring-2">
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
                          <Info className="w-3.5 h-3.5" /> Model Reasoning
                        </div>
                        <p className="text-[12px] font-medium leading-relaxed italic text-foreground/80 bg-primary/5 p-4 rounded-2xl border border-primary/10 text-left">
                          "{item.reasoning}"
                        </p>
                      </section>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[8px] font-black text-red-600 uppercase">Pro</p><p className="text-lg font-black">{item.macros.protein}g</p></div>
                        <div className="p-3 bg-yellow-50 rounded-xl text-center"><p className="text-[8px] font-black text-yellow-600 uppercase">Cho</p><p className="text-lg font-black">{item.macros.carbs}g</p></div>
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

      {aiPlan && (
        <section className="space-y-8 animate-in zoom-in duration-500">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-lg uppercase tracking-tight text-left">Matched Menu Templates</h2>
            <Button variant="ghost" onClick={() => setAiPlan(null)} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </div>
          <Card className="rounded-[2.5rem] border-none shadow-premium-lg bg-white overflow-hidden">
            <CardContent className="p-8 sm:p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { time: "Breakfast", data: aiPlan.Breakfast },
                  { time: "Lunch", data: aiPlan.Lunch },
                  { time: "Dinner", data: aiPlan.Dinner }
                ].map((meal, i) => (
                  <div key={i} className="flex flex-col h-full space-y-6 p-6 bg-secondary/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all group">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase text-primary tracking-[0.3em]">{meal.time}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSwapMeal(meal.time)}
                            className="h-6 w-6 rounded-full hover:bg-primary/10 text-primary group-hover:rotate-180 transition-all duration-500"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                        {meal.data.deliveryMatch?.isAvailable && (
                          <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase px-2 py-0.5">Delivery</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-left">
                        <h4 className="font-black text-lg uppercase leading-tight group-hover:text-primary transition-colors text-left">{meal.data.name}</h4>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">+{meal.data.calories} kcal • {meal.data.macros.protein}g Protein</p>
                      </div>
                      {meal.data.deliveryMatch?.isAvailable && (
                        <div className="p-4 bg-white/70 rounded-xl border border-green-100 shadow-sm text-left">
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
