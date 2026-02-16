
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  TrendingUp, 
  Loader2,
  Cpu,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  List,
  ChefHat,
  Leaf,
  Bike,
  Plus,
  RefreshCw,
} from "lucide-react"
import { 
  Dialog, 
  DialogTrigger,
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { format, addDays, subDays, startOfToday } from "date-fns"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"
import { generateDailyPlan } from "@/ai/flows/generate-daily-plan"
import { personalizedDietPlans } from "@/ai/flows/personalized-diet-plans"
import { analyzeTextMeal } from "@/ai/flows/analyze-text-meal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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
  
  const [targetDate, setTargetDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"))
  
  const [loadingRecipeGen, setLoadingRecipeGen] = useState(false)
  const [recipeGenResult, setRecipeGenResult] = useState<any | null>(null)
  const [availableIngredients, setAvailableIngredients] = useState("")
  const [isAddingPantryRecipe, setIsAddingPantryRecipe] = useState<string | null>(null)

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

  const handleGenerateMenu = async (isRecovery = false) => {
    if (!profile) return;
    setLoading(true)
    setMenuPlan(null)
    setSwappedMeals({ breakfast: false, lunch: false, dinner: false })
    try {
       const dietTypeParts = [
        ...(profile.dietaryRestrictions || []),
        ...(isRecovery ? ['High Protein'] : [])
      ];
      const plan = await generateDailyPlan({
        calorieTarget: (profile.calorieTarget || 2000) + (isRecovery ? 300 : 0),
        proteinPercent: isRecovery ? 40 : 30,
        carbsPercent: 40,
        fatPercent: isRecovery ? 20 : 30,
        dietType: dietTypeParts.join(", "),
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
            dietaryNeeds: profile?.dietaryRestrictions?.join(", ") || "No specific needs",
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

  const handleRequestCookBuddy = (meal: any) => {
    if (!user || !firestore) return;
    const dateId = targetDate || format(new Date(), "yyyy-MM-dd");
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId);
    const mealsColRef = collection(dailyLogRef, "meals");
    
    setDocumentNonBlocking(dailyLogRef, { date: dateId }, { merge: true });

    const finalTime = meal.time || "12:00 PM";

    addDocumentNonBlocking(mealsColRef, {
      name: meal.name,
      calories: meal.calories,
      time: finalTime,
      source: "CookBuddy",
      macros: meal.macros,
      healthScore: 95,
      description: meal.description,
      expertInsight: "Professionally prepared and delivered by CookBuddy.",
      ingredients: meal.ingredients || [],
      instructions: ["Professionally prepared and delivered by CookBuddy."],
      status: "planned",
      createdAt: serverTimestamp()
    });

    toast({
      title: "CookBuddy Requested!",
      description: `Your "${meal.name}" has been scheduled and will be delivered.`,
    });

    setIsMenuOpen(false);
  };

  const handleAddAll = async (isRecovery = false) => {
    if (!user || !firestore || !menuPlan) return;
    const dateId = targetDate || format(new Date(), "yyyy-MM-dd");
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId);
    const mealsColRef = collection(dailyLogRef, "meals");
    
    setDocumentNonBlocking(dailyLogRef, { date: dateId }, { merge: true });

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
        expertInsight: isRecovery ? "Recovery-focused synthesis." : "Daily predictive synthesis.",
        ingredients: item.ingredients || [],
        instructions: item.instructions || [],
        status: "planned",
        createdAt: serverTimestamp()
      });
    });

    toast({ title: "Full Path Predicted", description: `Plan saved for ${dateId}.` });
    setIsMenuOpen(false)
    router.push("/")
  }

  const handleAddPantryRecipeToPlan = async (mealName: string) => {
    if (!user || !firestore || !profile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to do that." });
      return;
    }
    
    setIsAddingPantryRecipe(mealName);
    
    try {
      const analysis = await analyzeTextMeal({
        mealName: mealName,
        ingredients: availableIngredients,
        userGoal: (profile?.bmiCategory === 'Overweight' || profile?.bmiCategory === 'Obese') ? "Weight Loss" : (profile?.bmiCategory === 'Underweight' ? "Weight Gain" : "Maintenance"),
        userAllergies: profile?.allergies,
        userRestrictions: profile?.dietaryRestrictions
      });

      const dateId = targetDate || format(new Date(), "yyyy-MM-dd");
      const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId);
      const mealsColRef = collection(dailyLogRef, "meals");
    
      setDocumentNonBlocking(dailyLogRef, { date: dateId }, { merge: true });

      const finalTime = "12:00 PM"; // Default time

      addDocumentNonBlocking(mealsColRef, {
        name: mealName,
        calories: analysis.calories,
        time: finalTime,
        timing: 'Lunch', // Default timing
        source: "pantry-ai",
        macros: analysis.macros,
        healthScore: analysis.healthScore,
        description: analysis.description,
        expertInsight: analysis.expertInsight,
        ingredients: analysis.ingredients,
        instructions: analysis.instructions,
        allergenWarning: analysis.allergenWarning || "",
        reminderEnabled: true,
        status: "planned",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Meal Added!",
        description: `"${mealName}" has been added to your plan for ${dateId}.`,
      });

    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "AI Error", description: "Could not analyze and add the meal." });
    } finally {
      setIsAddingPantryRecipe(null);
    }
  }

  const featureCards = [
    { 
      id: 'curation',
      title: 'ML Curation',
      description: 'Neural recommendation engine for platform ecosystem matching.',
      icon: Cpu,
      color: 'primary',
      action: () => { setIsDeliveryOpen(true); handleCurateDelivery() },
      buttonText: 'Execute Scorer',
    },
    { 
      id: 'predictive',
      title: 'Predictive Path',
      description: 'Synthesize daily nutritional path using predictive models.',
      icon: Sparkles,
      color: 'accent',
      action: () => { setIsMenuOpen(true); handleGenerateMenu(false) },
      buttonText: 'Synthesize Path',
    },
    { 
      id: 'pantry',
      title: 'Recipe From Pantry',
      description: 'Generate simple recipes using what you already have.',
      icon: ChefHat,
      color: 'blue',
      action: () => setIsRecipeGenOpen(true),
      buttonText: 'Create Recipe',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-4 pb-24 min-h-screen text-center">
      <header className="space-y-1 pt-safe text-center">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Explore</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Discovery Hub</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mx-auto">
        {featureCards.map(card => (
          <Card key={card.id} className="rounded-[2rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-6 flex flex-col items-center justify-between text-center space-y-4 active:scale-[0.98]">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0 border-2",
              card.color === 'primary' && 'bg-primary/10 border-primary/20',
              card.color === 'accent' && 'bg-accent/10 border-accent/20',
              card.color === 'blue' && 'bg-blue-100 border-blue-200',
            )}>
              <card.icon className={cn(
                "w-8 h-8",
                card.color === 'primary' && 'text-primary',
                card.color === 'accent' && 'text-accent-foreground',
                card.color === 'blue' && 'text-blue-600',
              )} />
            </div>
            <div className="space-y-1.5 text-center flex-1">
              <h3 className="text-base font-black tracking-tighter uppercase text-foreground">{card.title}</h3>
              <p className="text-foreground/60 font-bold text-[10px] leading-snug max-w-xs uppercase tracking-wider">
                {card.description}
              </p>
            </div>
            <Button onClick={card.action} variant="secondary" className={cn(
              "w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-none",
              card.color === 'accent' && 'bg-accent text-accent-foreground hover:bg-accent/90',
              card.color === 'blue' && 'bg-blue-600 hover:bg-blue-700 text-white'
            )}>
              {card.buttonText}
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={isDeliveryOpen} onOpenChange={setIsDeliveryOpen}>
        <DialogContent className="max-w-4xl rounded-[2.5rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-8 text-center border-b">
              <DialogTitle className="text-center">NutriPal V1: ML Delivery Hub</DialogTitle>
              <DialogDescription className="text-center">Top recommendations from GrabFood & GoFood based on your profile.</DialogDescription>
          </DialogHeader>
          <div className="p-8 pt-0 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Calculating Scores...</p>
                </div>
              ) : deliveryResult?.map((item) => (
                <Card key={item.id} className="rounded-[2rem] border shadow-premium bg-card group transition-all ring-primary/20 hover:ring-4 overflow-hidden flex flex-col">
                  <CardContent className="p-6 flex flex-col h-full space-y-4 text-left">
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-start">
                        <Badge variant={item.platform === 'GrabFood' ? 'default' : 'secondary'}>{item.platform}</Badge>
                        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-wider">
                          <TrendingUp className="w-4 h-4" /> {item.healthScore}% Match
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black tracking-tighter uppercase text-foreground leading-tight">{item.name}</h3>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.restaurant}</p>
                      </div>
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <p className="text-xs font-bold leading-snug italic text-foreground/80">"{item.reasoning}"</p>
                      </div>
                      
                      {item.ingredients && (
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                            <List className="w-3 h-3" /> Ingredients
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.ingredients.map((ing: string, i: number) => (
                               <Badge key={i} variant="outline" className="text-[9px] font-bold rounded-md">{ing}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                         <div className="text-center">
                           <p className="text-[8px] font-black text-muted-foreground uppercase">Protein</p>
                           <p className="text-base font-black text-primary">{item.macros.protein}g</p>
                         </div>
                         <div className="text-center">
                           <p className="text-[8px] font-black text-muted-foreground uppercase">Carbs</p>
                           <p className="text-base font-black text-blue-500">{item.macros.carbs}g</p>
                         </div>
                         <div className="text-center">
                           <p className="text-[8px] font-black text-muted-foreground uppercase">Fat</p>
                           <p className="text-base font-black text-accent">{item.macros.fat}g</p>
                         </div>
                      </div>
                    </div>
                  </CardContent>
                   <DialogFooter className="p-6 pt-0">
                      <Button onClick={() => handleOrderNow(item, 'delivery')} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs flex gap-2">
                        <ExternalLink className="w-4 h-4" /> Order & Sync
                      </Button>
                    </DialogFooter>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="max-w-6xl rounded-[2.5rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-8 text-center border-b">
              <DialogTitle className="text-center">NutriPal V1: Predictive Synthesis</DialogTitle>
              <div className="text-sm text-muted-foreground font-bold flex items-center justify-center gap-4">
                <span>A full day's meal plan synthesized by AI based on your profile.</span>
                <div className="flex items-center gap-2 bg-secondary rounded-full px-4 h-10 border shadow-sm">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-transparent border-none text-sm font-semibold focus:ring-0 w-32 text-foreground cursor-pointer" />
                </div>
              </div>
          </DialogHeader>
          <div className="p-8 pt-0 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <Card key={type} className="rounded-[2rem] border shadow-premium bg-card group transition-all ring-accent/20 hover:ring-4 overflow-hidden flex flex-col relative">
                    <Button variant="outline" size="icon" onClick={() => handleSwap(type)} className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm">
                      <RefreshCw className="w-4 h-4 text-accent" />
                    </Button>
                    <CardContent className="p-5 flex flex-col h-full space-y-3 text-left">
                      <div className="flex-1 space-y-3">
                        <Badge variant="secondary" className="bg-accent/10 text-accent-foreground uppercase text-[8px] font-black tracking-widest px-3 py-1 rounded-lg border-none">{type}</Badge>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <Clock className="w-3 h-3 opacity-40" />
                             <span className="text-[9px] font-black uppercase opacity-50">{finalTime}</span>
                          </div>
                          <h3 className="text-base font-black tracking-tighter uppercase text-foreground line-clamp-1">{meal.name}</h3>
                          <p className="text-[10px] font-bold leading-snug text-muted-foreground line-clamp-2">{meal.description}</p>
                        </div>
                        
                        {meal.ingredients && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[8px] font-bold rounded-md px-2 py-0.5">{ing}</Badge>
                              ))}
                              {meal.ingredients.length > 4 && <Badge variant="outline" className="text-[8px] font-bold rounded-md px-2 py-0.5">+{meal.ingredients.length - 4} more</Badge>}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 border-y py-3">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-muted-foreground uppercase">Protein</p>
                            <p className="text-sm font-black text-primary">{meal.macros.protein}g</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-muted-foreground uppercase">Carbs</p>
                            <p className="text-sm font-black text-blue-500">{meal.macros.carbs}g</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-muted-foreground uppercase">Fat</p>
                            <p className="text-sm font-black text-accent">{meal.macros.fat}g</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={() => handleOrderNow({ ...meal, time: finalTime }, 'menu')} variant="secondary" className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-widest">
                            <Plus className="w-4 h-4 mr-1" /> Self-Cook
                        </Button>
                        <Button onClick={() => handleRequestCookBuddy(meal)} className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-widest">
                            <Bike className="w-4 h-4 mr-1" /> CookBuddy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
           <DialogFooter className="p-6 bg-background rounded-b-[2.5rem] border-t">
              {menuPlan && !loading && (
                <Button onClick={() => handleAddAll()} className="w-full">
                   <Plus className="w-4 h-4 mr-2" /> Schedule All Meals
                </Button>
              )}
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecipeGenOpen} onOpenChange={(open) => { setIsRecipeGenOpen(open); if(open) { setRecipeGenResult(null); setAvailableIngredients('') } }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 border-none shadow-premium-lg bg-white w-[94vw] md:left-[calc(50%+8rem)] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-8 text-center border-b">
            <DialogTitle className="text-center">Recipe From Pantry</DialogTitle>
             <DialogDescription className="text-center">Generate meal ideas using ingredients you already have.</DialogDescription>
          </DialogHeader>
          <div className="p-8 pt-0 overflow-y-auto flex-1">
            {loadingRecipeGen ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-40">Thinking of Recipes...</p>
              </div>
            ) : recipeGenResult ? (
              <div className="space-y-8 text-left">
                <section className="space-y-4 animate-in fade-in">
                  <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary"/> Meal Ideas</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recipeGenResult.mealRecommendations.map((mealName: string, i: number) => (
                      <Card key={i} className="bg-card rounded-2xl border p-4 flex flex-col justify-between text-left shadow-sm">
                        <p className="text-sm font-black uppercase tracking-tight text-foreground flex-1">{mealName}</p>
                        <Button 
                            size="sm" 
                            className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 text-[10px] font-black uppercase tracking-widest"
                            disabled={!!isAddingPantryRecipe}
                            onClick={() => handleAddPantryRecipeToPlan(mealName)}>
                            {isAddingPantryRecipe === mealName ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3 h-3 mr-1.5" /> Add to Plan</>}
                        </Button>
                      </Card>
                    ))}
                  </div>
                </section>
                <section className="space-y-4 animate-in fade-in delay-100">
                  <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><List className="w-5 h-5 text-primary"/> Recipes</h2>
                  <div className="whitespace-pre-wrap bg-muted/30 p-6 rounded-2xl text-xs font-bold text-foreground/70 leading-relaxed border">
                    {recipeGenResult.recipes.join('\n\n---\n\n')}
                  </div>
                </section>
                <section className="space-y-4 animate-in fade-in delay-200">
                  <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Leaf className="w-5 h-5 text-green-600"/> Healthier Alternatives</h2>
                  <div className="grid grid-cols-1 gap-3">
                      {recipeGenResult.healthierAlternatives.map((alt: string, i: number) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <p className="text-sm font-medium text-foreground/80">{alt}</p>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-6 text-left">
                  <div className="space-y-2">
                      <Label htmlFor="ingredients-pantry" className="text-sm font-semibold ml-1">What's in your pantry?</Label>
                      <Textarea 
                        id="ingredients-pantry"
                        placeholder="e.g. Avocado, Spinach, Quinoa, Chicken breast, eggs..."
                        value={availableIngredients}
                        onChange={(e) => setAvailableIngredients(e.target.value)}
                        className="min-h-[120px] rounded-2xl border-2 font-semibold"
                        required
                      />
                  </div>
                  <Button 
                      onClick={handleGenerateFromPantry}
                      className="w-full h-14 text-lg rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                      disabled={loadingRecipeGen || !availableIngredients}
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
  )
}

    