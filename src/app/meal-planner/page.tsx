
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Utensils, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2, Sparkles, CookingPot, Trophy, Calendar as CalendarIcon, Bell, BellOff, ChevronRightIcon } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
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
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealName, setEditMealName] = useState("")
  const [editMealType, setEditMealType] = useState("Breakfast")
  const [editReminderEnabled, setEditReminderEnabled] = useState(false)

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
  const handleToday = () => setDate(startOfToday())

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
  }

  const handleAddMeal = async () => {
    if (!user || !mealsColRef || !mealName) return
    setIsSaving(true)
    
    if (reminderEnabled) {
      await requestNotificationPermission();
    }

    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    addDocumentNonBlocking(mealsColRef, {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 438,
      macros: { protein: 12, carbs: 33, fat: 18 },
      healthScore: 78,
      description: "Scheduled for energy balance throughout your day.",
      source: "planner",
      reminderEnabled,
      createdAt: serverTimestamp()
    })
    setMealName(""); setIsDialogOpen(false); setIsSaving(false)
    toast({ 
      title: "Schedule Added", 
      description: reminderEnabled ? `${mealName} scheduled with reminder.` : `${mealName} is on the menu.` 
    })
  }

  const handleOpenEdit = (meal: any) => {
    setEditingMealId(meal.id); 
    setEditMealName(meal.name); 
    setEditMealType(meal.type);
    setEditReminderEnabled(!!meal.reminderEnabled);
  }

  const handleUpdateMeal = async () => {
    if (!user || !mealsColRef || !editingMealId) return
    
    if (editReminderEnabled) {
      await requestNotificationPermission();
    }

    const mealRef = doc(mealsColRef, editingMealId)
    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    updateDocumentNonBlocking(mealRef, { 
      name: editMealName, 
      type: editMealType, 
      time: timeMap[editMealType] || "12:00 PM",
      reminderEnabled: editReminderEnabled
    })
    setEditingMealId(null)
    toast({ title: "Schedule Updated", description: "Menu updated." })
  }

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    deleteDocumentNonBlocking(doc(mealsColRef, mealId))
    toast({ variant: "destructive", title: "Meal Deleted", description: `${mealName} removed from schedule.` })
  }

  const handleGetRecipe = async (mealId: string, mealName: string) => {
    if (recipes[mealId]) {
      const newRecipes = { ...recipes }; delete newRecipes[mealId]; setRecipes(newRecipes); return
    }
    setLoadingRecipe({ ...loadingRecipe, [mealId]: true })
    try {
      const { recipe } = await generateRecipe({ mealName, dietaryRestrictions: profile?.dietaryRestrictions || [] })
      setRecipes({ ...recipes, [mealId]: recipe })
    } catch (error: any) {
      console.error("Failed to generate recipe", error)
      toast({
        variant: "destructive",
        title: "Recipe AI Unavailable",
        description: error.message?.includes("429") 
          ? "Our recipe AI is currently over capacity. Please try again in a few seconds." 
          : "We couldn't generate your recipe at this time.",
      })
    } finally {
      setLoadingRecipe({ ...loadingRecipe, [mealId]: false })
    }
  }

  if (!mounted || !date) return null

  return (
    <div className="min-h-screen pb-24 bg-background font-body relative">
      <main className="max-w-5xl mx-auto px-8 py-8 space-y-10 animate-in fade-in duration-500">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-safe md:pt-8">
          <div className="space-y-1.5 w-full lg:w-auto text-left">
            <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Meal Planner</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Weekly Nutrition Organizer</p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <Button 
              variant="outline" 
              onClick={handleToday} 
              className="rounded-full h-12 px-5 font-black uppercase text-[10px] tracking-widest border-border shadow-sm hover:bg-secondary/50 transition-all shrink-0"
            >
              Today
            </Button>
            
            <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
              <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-4 font-black text-[11px] text-foreground uppercase tracking-widest min-w-[160px] justify-center">
                <CalendarIcon className="h-3.5 w-3.5 text-primary/60" />
                <span className="whitespace-nowrap">{format(date, "EEEE, MMM d")}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-10 w-10 rounded-full hover:bg-secondary/50 shrink-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0">
                  <Plus className="w-4 h-4 mr-2" /> Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem]">
                <DialogHeader><DialogTitle className="text-2xl font-black text-center pt-4 uppercase tracking-tight">Schedule Meal</DialogTitle></DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Time</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
                    <Input placeholder="e.g. Avocado Toast" className="h-12 rounded-2xl font-bold" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-black uppercase tracking-widest">Set Reminder</Label>
                      <p className="text-[10px] text-muted-foreground font-medium">Notify me 15 mins before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
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
        </header>

        <Link href="/planner">
          <Card className="rounded-[2.5rem] bg-primary/10 border-none text-foreground shadow-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.01]">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black tracking-tight">Feeling Indecisive?</h2>
                  <p className="text-muted-foreground font-medium text-sm">Let AI curate your meals from Grab & Gojek based on your profile.</p>
                </div>
              </div>
              <ChevronRightIcon className="w-6 h-6 opacity-20 text-primary" />
            </CardContent>
          </Card>
        </Link>

        <div className="space-y-8">
          <h2 className="text-3xl font-black tracking-tight px-2 uppercase">Your Schedule</h2>
          <div className="space-y-6">
            {isLoadingMeals ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : scheduledMeals && scheduledMeals.length > 0 ? (
                scheduledMeals.map((meal) => (
                  <div key={meal.id} className="space-y-0">
                    <Card className={cn("group border-none shadow-sm hover:shadow-md transition-all rounded-[2.5rem] overflow-hidden bg-white relative", recipes[meal.id] && "rounded-b-none")}>
                      <CardContent className="p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-center gap-8 flex-1">
                             <div className="text-center min-w-[100px] border-r pr-8 border-border">
                               <p className="text-xl font-black text-primary/40 whitespace-nowrap">{meal.time}</p>
                             </div>
                             <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-2xl font-black tracking-tight">{meal.name}</h3>
                                  {meal.reminderEnabled ? <Bell className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground/30" />}
                                </div>
                                <div className="flex items-center gap-4">
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+{meal.calories || 438} KCAL</p>
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[10px] font-black uppercase text-red-500">{meal.macros?.protein || 12}G Protein</span>
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-1" /><span className="text-[10px] font-black uppercase text-yellow-600">{meal.macros?.carbs || 33}G Carbs</span>
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" /><span className="text-[10px] font-black uppercase text-blue-500">{meal.macros?.fat || 18}G Fat</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                             <Button variant="secondary" size="sm" onClick={() => handleGetRecipe(meal.id, meal.name)} disabled={loadingRecipe[meal.id]} className="rounded-full font-black text-[10px] uppercase tracking-widest h-10 px-6 bg-primary/10 text-primary hover:bg-primary/20">
                                {loadingRecipe[meal.id] ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CookingPot className="w-3 h-3 mr-2" />}
                                AI Recipe
                             </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(meal)} className="text-muted-foreground hover:text-primary rounded-full"><Edit2 className="w-4 h-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-full"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {recipes[meal.id] && (
                      <Card className="border-none shadow-md rounded-[2.5rem] rounded-t-none bg-primary/5 animate-in slide-in-from-top-4 duration-500">
                        <CardContent className="p-8 pt-10 space-y-6">
                          <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                             <div className="flex items-center gap-2"><Trophy className="text-primary w-4 h-4" /><span className="text-sm font-black uppercase tracking-widest text-primary">Health Score: {meal.healthScore || 78}/100</span></div>
                             <Progress value={meal.healthScore || 78} className="w-32 h-1.5" />
                          </div>
                          <div className="space-y-4 text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed text-sm">{recipes[meal.id]}</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center">
                  <Utensils className="w-16 h-16 mb-4 text-muted-foreground/10" />
                  <p className="text-muted-foreground font-bold text-lg">No meals scheduled for this day.</p>
                </div>
              )}
          </div>
        </div>
      </main>

      <Dialog open={!!editingMealId} onOpenChange={(open) => !open && setEditingMealId(null)}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black text-center pt-4 uppercase tracking-tight">Edit Meal</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Time</Label>
              <Select value={editMealType} onValueChange={setEditMealType}>
                <SelectTrigger className="h-12 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
              <Input className="h-12 rounded-2xl font-bold" value={editMealName} onChange={(e) => setEditMealName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-widest">Set Reminder</Label>
                <p className="text-[10px] text-muted-foreground font-medium">Notify me 15 mins before meal time.</p>
              </div>
              <Switch checked={editReminderEnabled} onCheckedChange={setEditReminderEnabled} />
            </div>
          </div>
          <DialogFooter className="pb-4">
            <Button onClick={handleUpdateMeal} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">Update Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
