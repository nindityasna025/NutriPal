
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Utensils, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2, Sparkles, CookingPot, Trophy, Info, ChevronRightIcon, Calendar as CalendarIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { addDays, subDays, format, startOfToday } from "date-fns"
import Link from "next/link"
import { generateRecipe } from "@/ai/flows/generate-recipe"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [recipes, setRecipes] = useState<Record<string, string>>({})
  const [loadingRecipe, setLoadingRecipe] = useState<Record<string, boolean>>({})
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [isSaving, setIsSaving] = useState(false)

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealName, setEditMealName] = useState("")
  const [editMealType, setEditMealType] = useState("Breakfast")

  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  const dateId = date ? format(date, "yyyy-MM-dd") : ""
  
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const mealsColRef = useMemoFirebase(() => 
    (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, 
    [user, firestore, dateId]
  )

  const { data: profile } = useDoc(profileRef)
  const { data: scheduledMeals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  const handlePrevDay = () => date && setDate(subDays(date, 1))
  const handleNextDay = () => date && setDate(addDays(date, 1))
  const handleToday = () => {
    const today = startOfToday()
    setDate(today)
  }

  const handleAddMeal = () => {
    if (!user || !mealsColRef || !mealName) return
    setIsSaving(true)
    const timeMap: Record<string, string> = { "Breakfast": "08:00 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:00 PM" }
    addDocumentNonBlocking(mealsColRef, {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 438,
      macros: { protein: 20, carbs: 50, fat: 15 },
      healthScore: 78,
      description: "Scheduled for energy balance throughout your day.",
      source: "planner",
      createdAt: serverTimestamp()
    })
    setMealName(""); setIsDialogOpen(false); setIsSaving(false)
    toast({ title: "Schedule Added", description: `${mealName} is on the menu.` })
  }

  const handleOpenEdit = (meal: any) => {
    setEditingMealId(meal.id); setEditMealName(meal.name); setEditMealType(meal.type)
  }

  const handleUpdateMeal = () => {
    if (!user || !mealsColRef || !editingMealId) return
    const mealRef = doc(mealsColRef, editingMealId)
    const timeMap: Record<string, string> = { "Breakfast": "08:00 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:00 PM" }
    updateDocumentNonBlocking(mealRef, { name: editMealName, type: editMealType, time: timeMap[editMealType] || "12:00 PM" })
    setEditingMealId(null)
    toast({ title: "Schedule Updated", description: "Menu updated." })
  }

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    deleteDocumentNonBlocking(doc(mealsColRef, mealId))
    toast({ variant: "destructive", title: "Meal Deleted", description: `${mealName} removed.` })
  }

  const handleGetRecipe = async (mealId: string, mealName: string) => {
    if (recipes[mealId]) {
      const newRecipes = { ...recipes }; delete newRecipes[mealId]; setRecipes(newRecipes); return
    }
    setLoadingRecipe({ ...loadingRecipe, [mealId]: true })
    try {
      const { recipe } = await generateRecipe({ mealName, dietaryRestrictions: profile?.dietaryRestrictions || [] })
      setRecipes({ ...recipes, [mealId]: recipe })
    } catch (error) {
      console.error("Failed to generate recipe", error)
    } finally {
      setLoadingRecipe({ ...loadingRecipe, [mealId]: false })
    }
  }

  if (!mounted || !date) return null

  return (
    <div className="min-h-screen pb-24 md:pt-10 bg-background font-body">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 w-full md:w-auto text-left">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Meal Planner</h1>
            <p className="text-muted-foreground font-medium text-sm">Organize your daily nutrition and schedule.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Date Selector Pill */}
            <div className="flex items-center justify-between bg-white rounded-full border border-border shadow-sm p-1 min-w-[280px] flex-1 md:flex-none">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevDay} 
                className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3 px-2 font-black text-sm text-foreground">
                <CalendarIcon className="h-5 w-5 text-primary/60" />
                <span className="whitespace-nowrap">{format(date, "EEEE, MMM d")}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextDay} 
                className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              onClick={handleToday} 
              className="rounded-xl h-11 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-border hidden sm:flex"
            >
              today
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg">
                  <Plus className="w-4 h-4 mr-2" /> Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-center pt-4">Schedule Meal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Time</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-2xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
                    <Input placeholder="e.g. Avocado Toast" className="h-12 rounded-2xl font-bold" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="pb-4">
                  <Button onClick={handleAddMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">
                    {isSaving ? <Loader2 className="animate-spin" /> : "Save Schedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* AI Curation Promo */}
        <Link href="/planner">
          <Card className="rounded-[3rem] bg-primary/10 border-none text-foreground shadow-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:bg-primary/15">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black tracking-tight">Feeling Indecisive?</h2>
                  <p className="text-muted-foreground font-medium text-sm">Let AI curate your meals from Grab & Gojek based on your profile.</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                <ChevronRightIcon className="w-5 h-5 opacity-40 text-primary" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Scheduled Meals List */}
        <div className="space-y-8">
          <h2 className="text-3xl font-black tracking-tight px-2">Scheduled Meals</h2>
          <div className="space-y-5">
            {isLoadingMeals ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : scheduledMeals && scheduledMeals.length > 0 ? (
                scheduledMeals.map((meal) => (
                  <div key={meal.id} className="space-y-0 relative">
                    <Card className={cn("group border-none shadow-sm hover:shadow-md transition-all rounded-[3rem] overflow-hidden bg-white relative", recipes[meal.id] && "rounded-b-none")}>
                      <CardContent className="p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-10">
                             <div className="text-center min-w-[100px] border-r pr-6 border-border">
                               <p className="text-xl font-black text-primary">{meal.time}</p>
                             </div>
                             <div className="space-y-1">
                                <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">{meal.name}</h3>
                                <div className="flex items-center gap-3">
                                   <p className="text-[11px] font-bold text-muted-foreground uppercase">+{meal.calories || 438} kcal</p>
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">{meal.macros?.protein || 20}g P</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                        <span className="text-[9px] font-black text-yellow-600 uppercase tracking-tighter">{meal.macros?.carbs || 50}g C</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{meal.macros?.fat || 15}g F</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <Button variant="secondary" size="sm" onClick={() => handleGetRecipe(meal.id, meal.name)} disabled={loadingRecipe[meal.id]} className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-6 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                                {loadingRecipe[meal.id] ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CookingPot className="w-3 h-3 mr-2" />}
                                {recipes[meal.id] ? "Hide Recipe" : "AI Recipe"}
                             </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(meal)} className="text-muted-foreground hover:text-primary rounded-full hover:bg-primary/5 h-10 w-10">
                               <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/5 h-10 w-10">
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {recipes[meal.id] && (
                      <Card className="border-none shadow-md rounded-[3rem] rounded-t-none bg-primary/5 animate-in slide-in-from-top-4 duration-500 overflow-hidden">
                        <CardContent className="p-8 pt-10 space-y-8">
                          <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                             <div className="flex items-center gap-2"><Trophy className="text-primary w-4 h-4" /><span className="text-sm font-black uppercase tracking-widest text-primary">Health Score: {meal.healthScore || 78}/100</span></div>
                             <Progress value={meal.healthScore || 78} className="w-32 h-1.5" />
                          </div>
                          <div className="space-y-2"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest"><Info className="w-3 h-3" /> Description</div><p className="text-sm font-medium leading-relaxed italic">"{meal.description || "This scheduled meal is designed to keep your metabolic rate stable and energy high throughout the day."}"</p></div>
                          <div className="space-y-6 text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed text-sm">{recipes[meal.id]}</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center">
                  <Utensils className="w-20 h-20 mb-6 text-muted-foreground/10" />
                  <p className="text-muted-foreground font-bold text-lg">No meals scheduled yet.</p>
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingMealId} onOpenChange={(open) => !open && setEditingMealId(null)}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center pt-4">Edit Meal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Time</Label>
              <Select value={editMealType} onValueChange={setEditMealType}>
                <SelectTrigger className="h-12 rounded-2xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
              <Input className="h-12 rounded-2xl font-bold" value={editMealName} onChange={(e) => setEditMealName(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pb-4">
            <Button onClick={handleUpdateMeal} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
