"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Utensils, Bell, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2, Sparkles, ChevronRightSquare, CookingPot, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { addDays, subDays, format, startOfToday } from "date-fns"
import Link from "next/link"
import { generateRecipe } from "@/ai/flows/generate-recipe"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

const initialScheduledMeals = [
  { id: 1, time: "08:30 AM", type: "Breakfast", name: "Oatmeal with Blueberries", calories: 320 },
  { id: 2, time: "12:30 PM", type: "Lunch", name: "Chicken Avocado Wrap", calories: 510 },
  { id: 3, time: "04:00 PM", type: "Snack", name: "Greek Yogurt & Nuts", calories: 180 },
  { id: 4, time: "07:30 PM", type: "Dinner", name: "Zucchini Noodles with Pesto", calories: 380 },
]

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [recipes, setRecipes] = useState<Record<number, string>>({})
  const [loadingRecipe, setLoadingRecipe] = useState<Record<number, boolean>>({})
  
  const { user } = useUser()
  const firestore = useFirestore()
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  const handlePrevDay = () => date && setDate(subDays(date, 1))
  const handleNextDay = () => date && setDate(addDays(date, 1))
  const handleToday = () => {
    const today = startOfToday()
    setDate(today)
  }

  const handleGetRecipe = async (mealId: number, mealName: string) => {
    if (recipes[mealId]) {
      // Toggle off if already showing
      const newRecipes = { ...recipes }
      delete newRecipes[mealId]
      setRecipes(newRecipes)
      return
    }

    setLoadingRecipe({ ...loadingRecipe, [mealId]: true })
    try {
      const { recipe } = await generateRecipe({
        mealName,
        dietaryRestrictions: profile?.dietaryRestrictions || []
      })
      setRecipes({ ...recipes, [mealId]: recipe })
    } catch (error) {
      console.error("Failed to generate recipe", error)
    } finally {
      setLoadingRecipe({ ...loadingRecipe, [mealId]: false })
    }
  }

  if (!mounted || !date) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening your meal planner...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pt-10 bg-background font-body">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500">
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              {format(date, "MMMM d, yyyy")}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleToday}
              className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest border-border bg-white"
            >
              today
            </Button>
            <div className="flex items-center border border-border rounded-xl bg-white overflow-hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevDay}
                className="h-10 w-10 rounded-none border-r border-border hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextDay}
                className="h-10 w-10 rounded-none hover:bg-muted"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 ml-2">
              <Plus className="w-4 h-4 mr-2" /> Add Meal
            </Button>
          </div>
        </section>

        <Link href="/planner">
          <Card className="rounded-[2.5rem] bg-primary border-none text-primary-foreground shadow-2xl shadow-primary/20 overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] mb-8">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">Feeling Indecisive?</h2>
                  <p className="text-primary-foreground/80 font-medium">Let AI curate your meals from Shopee, Grab & Gojek based on your profile.</p>
                </div>
              </div>
              <ChevronRightSquare className="w-10 h-10 opacity-30" />
            </CardContent>
          </Card>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-4">
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-3xl font-black tracking-tight">
                Scheduled Meals
              </h2>
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">
                Total: 1,390 kcal
              </Badge>
            </div>

            <div className="space-y-5">
              {initialScheduledMeals.map((meal) => (
                <div key={meal.id} className="space-y-2">
                  <Card className={cn(
                    "group border-none shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden border-l-8 border-l-primary bg-white",
                    recipes[meal.id] && "rounded-b-none"
                  )}>
                    <CardContent className="p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-6 md:gap-10">
                           <div className="text-center min-w-[80px] md:min-w-[100px]">
                              <p className="text-lg md:text-xl font-black text-primary">{meal.time}</p>
                              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{meal.type}</p>
                           </div>
                           <div className="h-12 w-px bg-border hidden sm:block" />
                           <div>
                              <h3 className="text-xl md:text-2xl font-black tracking-tight group-hover:text-primary transition-colors">{meal.name}</h3>
                              <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{meal.calories} kcal • Low Sodium • High Protein</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                           <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => handleGetRecipe(meal.id, meal.name)}
                              disabled={loadingRecipe[meal.id]}
                              className="rounded-xl font-black text-[10px] uppercase tracking-widest h-9 px-4 bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              {loadingRecipe[meal.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                              ) : (
                                <CookingPot className="w-3 h-3 mr-2" />
                              )}
                              {recipes[meal.id] ? "Hide Recipe" : "AI Recipe"}
                           </Button>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full hover:bg-primary/5 h-9 w-9">
                              <Edit2 className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/5 h-9 w-9">
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {recipes[meal.id] && (
                    <Card className="border-none shadow-md rounded-[2rem] rounded-t-none bg-primary/5 animate-in slide-in-from-top-2 duration-300">
                      <CardContent className="p-8 pt-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI Kitchen Instructions</span>
                        </div>
                        <div className="prose prose-sm max-w-none text-foreground/80 font-medium whitespace-pre-wrap leading-relaxed">
                          {recipes[meal.id]}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
             <Card className="bg-secondary/30 border-none rounded-[2.5rem] shadow-none overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                    <Bell className="w-4 h-4 text-primary" /> 
                    Meal Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      You will receive notifications 30 minutes before each meal time to help you stay on track.
                   </p>
                   <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 font-black rounded-2xl h-12 uppercase text-[10px] tracking-widest">
                      Manage Alerts
                   </Button>
                </CardContent>
             </Card>

             <Card className="border-none rounded-[2.5rem] shadow-sm bg-accent/10 border-accent/20">
                <CardHeader className="pb-2">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <Utensils className="w-4 h-4 text-accent-foreground" />
                      Prep Tips
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <ul className="space-y-4 text-sm font-medium text-foreground">
                      <li className="flex items-start gap-3 italic">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                         "Prepare vegetable cuts at night to save time for breakfast."
                      </li>
                      <li className="flex items-start gap-3 italic">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                         "Don't forget to drink 2 glasses of water before lunch."
                      </li>
                   </ul>
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
