"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  TrendingUp, 
  Loader2,
  ChevronLeft,
  RefreshCw,
  Plus,
  Cpu,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  List,
  ChefHat,
  Leaf
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"
import { generateDailyPlan } from "@/ai/flows/generate-daily-plan"
import { personalizedDietPlans } from "@/ai/flows/personalized-diet-plans"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const SCRAPED_DATABASE = [
  { 
    id: "s1", 
    name: "Roasted Salmon Poke", 
    restaurant: "Honu Poke", 
    price: "Rp 65,000", 
    platform: "GrabFood" as const, 
    calories: 420, 
    macros: { protein: 28, carbs: 45, fat: 12 }, 
    healthScore: 95, 
    tags: ["Healthy", "High Protein"],
    ingredients: ["Salmon", "Quinoa", "Avocado", "Edamame", "Cucumber"]
  },
  { 
    id: "s2", 
    name: "Tempeh Quinoa Bowl", 
    restaurant: "Vegan Vibe", 
    price: "Rp 42,000", 
    platform: "GoFood" as const, 
    calories: 380, 
    macros: { protein: 18, carbs: 55, fat: 10 }, 
    healthScore: 98, 
    tags: ["Vegetarian", "Vegan"],
    ingredients: ["Tempeh", "Quinoa", "Spinach", "Sweet Potato", "Sesame Seeds"]
  },
  { 
    id: "s3", 
    name: "Grilled Chicken Caesar", 
    restaurant: "SaladStop!", 
    price: "Rp 75,000", 
    platform: "GrabFood" as const, 
    calories: 450, 
    macros: { protein: 32, carbs: 12, fat: 28 }, 
    healthScore: 88, 
    tags: ["High Protein"],
    ingredients: ["Chicken Breast", "Romaine Lettuce", "Parmesan", "Croutons", "Caesar Dressing"]
  },
  { 
    id: "s4", 
    name: "Keto Beef Stir-fry", 
    restaurant: "FitKitchen", 
    price: "Rp 58,000", 
    platform: "GoFood" as const, 
    calories: 510, 
    macros: { protein: 35, carbs: 8, fat: 34 }, 
    healthScore: 90, 
    tags: ["Keto", "Low Carb"],
    ingredients: ["Beef Strips", "Broccoli", "Bell Peppers", "Mushrooms", "Olive Oil"]
  },
];

export default function ExplorePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRecipeGenOpen, setIsRecipeGenOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [deliveryResult, setDeliveryResult] = useState<any[] | null>(null)
  const [menuPlan, setMenuPlan] = useState<any | null>(null)
  const [swappedMeals, setSwappedMeals] = useState<Record<string, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false
  })
  
  const [targetDate, setTargetDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  
  const [loadingRecipeGen, setLoadingRecipeGen] = useState(false)
  const [recipeGenResult, setRecipeGenResult] = useState<any | null>(null)
  const [dietaryNeeds, setDietaryNeeds] = useState("")
  const [availableIngredients, setAvailableIngredients] = useState("")

  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurateDelivery = async () => {
    if (!profile) return;
    setLoading(true)
    setDeliveryResult(null)
    try {
      const result = await curateMealSuggestions({
        userProfile: {
          bmiCategory: profile.bmiCategory,
          dietaryRestrictions: profile.dietaryRestrictions,
          allergies: profile.allergies,
          calorieTarget: profile.calorieTarget
        },
        scrapedDatabase: SCRAPED_DATABASE
      });
      setDeliveryResult(result.topMatches);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "ML Hub Error", description: "AI Fallback enabled." });
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateMenu = async () => {
    if (!profile) return;
    setLoading(true)
    setMenuPlan(null)
    setSwappedMeals({ breakfast: false, lunch: false, dinner: false })
    try {
      const plan = await generateDailyPlan({
        calorieTarget: profile.calorieTarget || 2000,
        proteinPercent: 30,
        carbsPercent: 40,
        fatPercent: 30,
        dietType: profile.dietaryRestrictions?.join(", "),
        allergies: profile.allergies
      });
      setMenuPlan(plan);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Synthesis Error", description: "Rule-based fallback active." });
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateFromPantry = async () => {
    if (!availableIngredients) {
        toast({ variant: "destructive", title: "Ingredients Missing", description: "Please list the ingredients you have." })
        return
    }
    setLoadingRecipeGen(true)
    setRecipeGenResult(null)
    try {
        const result = await personalizedDietPlans({
            dietaryNeeds: dietaryNeeds || profile?.dietaryRestrictions?.join(", ") || "No specific needs",
            availableIngredients,
        });
        setRecipeGenResult(result);
    } catch (err: any) {
        console.error(err);
        toast({ variant: "destructive", title: "AI Generation Error", description: "The AI could not generate recipes at this time." });
    } finally {
        setLoadingRecipeGen(false);
    }
  }

  const handleSwap = (type: string) => {
    setSwappedMeals(prev => ({ ...prev, [type]: !prev[type] }))
    toast({ title: "Meal Swapped", description: `Showing alternative for ${type}.` })
  }

  const handleOrderNow = async (item: any, source: 'delivery' | 'menu') => {
    if (!user || !firestore) return
    const dateId = format(new Date(), "yyyy-MM-dd")
    
    let finalTime = item.time || format(new Date(), "hh:mm a").toUpperCase()
    
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealsColRef = collection(dailyLogRef, "meals")
    
    setDocumentNonBlocking(dailyLogRef, { date: dateId }, { merge: true })

    addDocumentNonBlocking(mealsColRef, {
      name: item.name,
      calories: item.calories,
      time: finalTime,
      source: item.platform || "planner",
      macros: item.macros,
      healthScore: item.healthScore || 90,
      description: item.description || "Optimized path.",
      expertInsight: item.reasoning || "Predicted for bio-metrics.",
      ingredients: item.ingredients || [],
      instructions: item.instructions || [],
      status: "planned",
      createdAt: serverTimestamp()
    })

    if (source === 'delivery') {
      const platformUrl = item.platform === 'GrabFood' 
        ? `https://food.grab.com/id/id/search/?search=${encodeURIComponent(item.restaurant)}`
        : `https://www.gojek.com/gofood/jakarta/search?q=${encodeURIComponent(item.restaurant)}`;
      
      window.open(platformUrl, '_blank');
      toast({ title: "Redirecting...", description: `Opening ${item.platform} for ${item.name}.` })
    } else {
      toast({ title: "Meal Synced", description: `${item.name} scheduled.` })
    }

    setIsDeliveryOpen(false)
    setIsMenuOpen(false)
    router.push("/")
  }

  const handleAddAll = async () => {
    if (!user || !firestore || !menuPlan) return
    const dateId = targetDate || format(new Date(), "yyyy-MM-dd")
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealsColRef = collection(dailyLogRef, "meals")
    
    setDocumentNonBlocking(dailyLogRef, { date: dateId }, { merge: true })

    const types = ["breakfast", "lunch", "dinner"] as const;
    types.forEach(type => {
      const isSwapped = swappedMeals[type];
      const baseMeal = menuPlan[type];
      const item = isSwapped ? baseMeal.swapSuggestion : baseMeal;
      const finalTime = item.time || baseMeal.time || "12:00 PM";

      addDocumentNonBlocking(mealsColRef, {
        name: item.name,
        calories: item.calories,
        time: finalTime,
        source: "planner",
        macros: item.macros,
        healthScore: 90,
        description: item.description,
        expertInsight: "Daily predictive synthesis.",
        ingredients: item.ingredients || [],
        instructions: item.instructions || [],
        status: "planned",
        createdAt: serverTimestamp()
      })
    });

    toast({ title: "Full Path Predicted", description: `Plan saved for ${dateId}.` })
    setIsMenuOpen(false)
    router.push("/")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12 pb-32 min-h-screen text-center">
      <header className="space-y-1 pt-safe text-center">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Explore</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Discovery Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pt-4 max-w-7xl mx-auto">
        <Dialog open={isDeliveryOpen} onOpenChange={(open) => { setIsDeliveryOpen(open); if(open) handleCurateDelivery(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-14 flex flex-col items-center justify-between text-center space-y-10 active:scale-[0.98]">
              <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2 border-primary/10">
                 <Cpu className="w-12 h-12 text-foreground" />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">ML Curation</h3>
                <p className="text-foreground opacity-50 font-black text-[11px] leading-relaxed max-w-xs uppercase tracking-widest">
                  Neural recommendation engine for platform ecosystem matching.
                </p>
              </div>
              <Button className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-primary text-foreground border-none">Execute Scorer</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[92vh] flex flex-col [&>button]:hidden">
            <DialogHeader className="bg-primary p-5 text-foreground shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <Button variant="ghost" onClick={() => setIsDeliveryOpen(false)} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-center flex-1">NUTRIPAL V1: ML DELIVERY HUB</DialogTitle>
              <div className="w-24"></div> 
            </DialogHeader>
            <div className="p-6 overflow-hidden flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Calculating Scores...</p>
                  </div>
                ) : deliveryResult?.map((item) => (
                  <Card key={item.id} className="rounded-[2.5rem] border-2 border-border shadow-premium bg-white group transition-all ring-primary/10 hover:ring-8 overflow-hidden flex flex-col">
                    <CardContent className="p-6 flex flex-col h-full space-y-4 text-left">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-accent font-black text-[9px] uppercase tracking-[0.1em]">
                            <TrendingUp className="w-4 h-4" /> {item.healthScore}% Match
                          </div>
                          <h3 className="text-xl font-black tracking-tighter uppercase text-foreground leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-2">
                             <Badge className={item.platform === 'GrabFood' ? 'bg-green-600 text-white border-none text-[8px]' : 'bg-red-600 text-white border-none text-[8px]'}>
                               {item.platform}
                             </Badge>
                             <p className="text-[9px] font-black text-foreground opacity-30 uppercase tracking-[0.1em]">{item.restaurant}</p>
                          </div>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-[1.5rem] border-2 border-primary/10">
                          <p className="text-[11px] font-black leading-tight italic text-foreground opacity-80">"{item.reasoning}"</p>
                        </div>
                        
                        {item.ingredients && (
                          <div className="space-y-1.5">
                            <p className="text-[7px] font-black text-foreground opacity-40 uppercase flex items-center gap-1">
                              <List className="w-2.5 h-2.5" /> Ingredients
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.ingredients.map((ing: string, i: number) => (
                                <span key={i} className="text-[8px] font-black uppercase bg-secondary/80 px-2 py-0.5 rounded-lg text-foreground opacity-60">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
                        <Button onClick={() => handleOrderNow(item, 'delivery')} className="w-full h-12 rounded-[1rem] font-black uppercase tracking-widest text-[10px] bg-foreground text-white border-none flex gap-2">
                          <ExternalLink className="w-4 h-4" /> Order & Sync
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if(open) handleGenerateMenu(); }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-14 flex flex-col items-center justify-between text-center space-y-10 active:scale-[0.98]">
              <div className="w-24 h-24 bg-accent/20 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2 border-accent/10">
                 <Sparkles className="w-12 h-12 text-foreground opacity-60" />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">Predictive Path</h3>
                <p className="text-foreground opacity-50 font-black text-[11px] leading-relaxed max-w-xs uppercase tracking-widest">
                  Synthesize daily nutritional path using predictive models.
                </p>
              </div>
              <Button variant="secondary" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-accent text-foreground hover:opacity-90 border-none">Synthesize Path</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-6xl rounded-[3rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[92vh] flex flex-col [&>button]:hidden">
            <DialogHeader className="bg-accent p-5 text-foreground shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <Button variant="ghost" onClick={() => setIsMenuOpen(false)} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-center flex-1">NUTRIPAL V1: PREDICTIVE SYNTHESIS</DialogTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/40 rounded-full px-4 h-10 border border-white/20 shadow-sm">
                  <CalendarIcon className="w-3.5 h-3.5 text-foreground" />
                  <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-transparent border-none text-[9px] font-black uppercase focus:ring-0 w-24 text-foreground cursor-pointer" />
                </div>
                {menuPlan && !loading && (
                  <Button onClick={handleAddAll} className="h-10 px-5 rounded-[0.75rem] bg-white text-foreground hover:bg-white/90 font-black uppercase text-[9px] tracking-widest shadow-xl border-none">
                     <Plus className="w-4 h-4 mr-2" /> Accept All
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="p-6 overflow-hidden flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Synthesizing Path...</p>
                  </div>
                ) : menuPlan && (["breakfast", "lunch", "dinner"] as const).map((type) => {
                  const isSwapped = swappedMeals[type];
                  const baseMeal = menuPlan[type];
                  const meal = isSwapped ? baseMeal.swapSuggestion : baseMeal;
                  const finalTime = meal.time || baseMeal.time || "12:00 PM";
                  return (
                    <Card key={type} className="rounded-[2.25rem] border-2 border-border shadow-premium bg-white group transition-all ring-accent/10 hover:ring-2 overflow-hidden flex flex-col relative">
                      <Button variant="ghost" size="icon" onClick={() => handleSwap(type)} className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm">
                        <RefreshCw className="w-4 h-4 text-accent" />
                      </Button>
                      <CardContent className="p-5 flex flex-col h-full space-y-4 text-left">
                        <div className="flex-1 space-y-4">
                          <Badge variant="secondary" className="bg-accent/20 text-foreground uppercase text-[8px] font-black tracking-widest px-3 py-1 rounded-[0.6rem] border-none">{type}</Badge>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <Clock className="w-3 h-3 opacity-30" />
                               <span className="text-[9px] font-black uppercase opacity-40">{finalTime}</span>
                            </div>
                            <h3 className="text-[15px] font-black tracking-tighter uppercase text-foreground line-clamp-1">{meal.name}</h3>
                            <p className="text-[9px] font-black leading-tight text-foreground opacity-30 line-clamp-2 uppercase tracking-tight">{meal.description}</p>
                          </div>
                          
                          {meal.ingredients && (
                            <div className="space-y-1.5">
                              <p className="text-[7px] font-black text-foreground opacity-40 uppercase flex items-center gap-1">
                                <List className="w-2.5 h-2.5" /> Ingredients
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                                  <span key={i} className="text-[7px] font-black uppercase bg-secondary/50 px-1.5 py-0.5 rounded-lg text-foreground opacity-60">
                                    {ing}
                                  </span>
                                ))}
                                {meal.ingredients.length > 4 && <span className="text-[7px] font-black opacity-30">+{meal.ingredients.length - 4} more</span>}
                              </div>
                            </div>
                          )}

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
                        </div>
                        <Button onClick={() => handleOrderNow({ ...meal, time: finalTime }, 'menu')} className="w-full rounded-[0.75rem] h-10 text-[8px] font-black uppercase tracking-widest bg-accent text-foreground border-none">
                          <Plus className="w-4 h-4 mr-2" /> Accept
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRecipeGenOpen} onOpenChange={(open) => { setIsRecipeGenOpen(open); if(open) { setRecipeGenResult(null); setDietaryNeeds(''); setAvailableIngredients('') } }}>
          <DialogTrigger asChild>
            <Card className="rounded-[3.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-14 flex flex-col items-center justify-between text-center space-y-10 active:scale-[0.98]">
              <div className="w-24 h-24 bg-blue-100 rounded-[2rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2 border-blue-200/50">
                <ChefHat className="w-12 h-12 text-blue-700" />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">Recipe From Pantry</h3>
                <p className="text-foreground opacity-50 font-black text-[11px] leading-relaxed max-w-xs uppercase tracking-widest">
                  Generate simple recipes using what you already have.
                </p>
              </div>
              <Button variant="secondary" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-blue-600 text-white hover:bg-blue-700 border-none">Create Recipe</Button>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[92vh] flex flex-col [&>button]:hidden">
            <DialogHeader className="bg-blue-600 p-5 text-white shrink-0 rounded-t-[3rem] flex flex-row items-center justify-between">
              <Button variant="ghost" onClick={() => setIsRecipeGenOpen(false)} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-center flex-1 text-white">RECIPE FROM PANTRY</DialogTitle>
              <div className="w-24"></div>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
              {loadingRecipeGen ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Thinking of Recipes...</p>
                </div>
              ) : recipeGenResult ? (
                <div className="space-y-8 text-left">
                  <section className="space-y-4 animate-in fade-in">
                    <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600"/> Meal Ideas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recipeGenResult.mealRecommendations.map((meal: string, i: number) => (
                        <div key={i} className="bg-blue-50/50 p-4 rounded-2xl text-sm font-black uppercase tracking-tight text-blue-800 border-2 border-blue-100">{meal}</div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4 animate-in fade-in delay-100">
                    <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><List className="w-5 h-5 text-blue-600"/> Recipes</h2>
                    <div className="whitespace-pre-wrap bg-muted/30 p-6 rounded-2xl text-xs font-bold text-foreground/70 leading-relaxed border border-border/50">
                      {recipeGenResult.recipes.join('\n\n---\n\n')}
                    </div>
                  </section>
                  <section className="space-y-4 animate-in fade-in delay-200">
                    <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Leaf className="w-5 h-5 text-green-600"/> Healthier Alternatives</h2>
                    <div className="grid grid-cols-1 gap-2">
                        {recipeGenResult.healthierAlternatives.map((alt: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <p className="text-sm font-medium text-foreground/80">{alt}</p>
                          </div>
                        ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 text-left">
                    <div className="space-y-2">
                        <Label htmlFor="needs-pantry" className="text-[10px] font-black uppercase tracking-widest ml-1">Dietary Needs (Optional)</Label>
                        <Input 
                          id="needs-pantry"
                          placeholder="e.g. Vegetarian, Gluten-free..."
                          value={dietaryNeeds}
                          onChange={(e) => setDietaryNeeds(e.target.value)}
                          className="rounded-2xl h-14 border-2 border-border focus:border-blue-600 font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ingredients-pantry" className="text-[10px] font-black uppercase tracking-widest ml-1">What's in your pantry?</Label>
                        <Textarea 
                          id="ingredients-pantry"
                          placeholder="e.g. Avocado, Spinach, Quinoa, Chicken breast, eggs..."
                          value={availableIngredients}
                          onChange={(e) => setAvailableIngredients(e.target.value)}
                          className="min-h-[120px] rounded-2xl border-2 border-border focus:border-blue-600 font-bold"
                          required
                        />
                    </div>
                    <Button 
                        onClick={handleGenerateFromPantry}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700 h-16 text-lg rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                        disabled={loadingRecipeGen}
                      >
                        {loadingRecipeGen ? (
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        ) : (
                          "Generate Recipes"
                        )}
                    </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
