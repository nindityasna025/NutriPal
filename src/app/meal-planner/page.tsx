
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
  
  // Form State for Adding
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [isSaving, setIsSaving] = useState(false)

  // Form State for Editing
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
    
    const timeMap: Record<string, string> = {
      "Breakfast": "08:00 AM",
      "Lunch": "01:00 PM",
      "Snack": "04:00 PM",
      "Dinner": "07:00 PM"
    }

    addDocumentNonBlocking(mealsColRef, {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 400,
      source: "planner",
      createdAt: serverTimestamp()
    })

    setMealName("")
    setIsDialogOpen(false)
    setIsSaving(false)
    toast({
      title: "Jadwal Berhasil Ditambahkan",
      description: `${mealName} telah masuk ke daftar menu Anda.`
    })
  }

  const handleOpenEdit = (meal: any) => {
    setEditingMealId(meal.id)
    setEditMealName(meal.name)
    setEditMealType(meal.type)
  }

  const handleUpdateMeal = () => {
    if (!user || !mealsColRef || !editingMealId) return
    
    const mealRef = doc(mealsColRef, editingMealId)
    const timeMap: Record<string, string> = {
      "Breakfast": "08:00 AM",
      "Lunch": "01:00 PM",
      "Snack": "04:00 PM",
      "Dinner": "07:00 PM"
    }

    updateDocumentNonBlocking(mealRef, {
      name: editMealName,
      type: editMealType,
      time: timeMap[editMealType] || "12:00 PM"
    })

    setEditingMealId(null)
    toast({
      title: "Jadwal Diperbarui",
      description: "Menu Anda telah berhasil diperbarui."
    })
  }

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    const mealRef = doc(mealsColRef, mealId)
    deleteDocumentNonBlocking(mealRef)
    toast({
      variant: "destructive",
      title: "Menu Dihapus",
      description: `${mealName} telah dihapus dari jadwal.`
    })
  }

  const handleGetRecipe = async (mealId: string, mealName: string) => {
    if (recipes[mealId]) {
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

  const totalCalories = scheduledMeals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0

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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 ml-2">
                  <Plus className="w-4 h-4 mr-2" /> Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight text-center pt-4">Add Scheduled Meal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Waktu Makan</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-2xl border-primary/20 font-bold">
                        <SelectValue placeholder="Pilih Waktu" />
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
                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Makanan</Label>
                    <Input
                      id="name"
                      placeholder="Contoh: Bubur Ayam Spesial"
                      className="h-12 rounded-2xl border-primary/20 font-bold"
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="pb-4">
                  <Button 
                    onClick={handleAddMeal} 
                    disabled={!mealName || isSaving}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : "Simpan ke Jadwal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Edit Dialog */}
        <Dialog open={!!editingMealId} onOpenChange={(open) => !open && setEditingMealId(null)}>
          <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-center pt-4">Edit Scheduled Meal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Waktu Makan</Label>
                <Select value={editMealType} onValueChange={setEditMealType}>
                  <SelectTrigger className="h-12 rounded-2xl border-primary/20 font-bold">
                    <SelectValue placeholder="Pilih Waktu" />
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
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Makanan</Label>
                <Input
                  placeholder="Contoh: Bubur Ayam Spesial"
                  className="h-12 rounded-2xl border-primary/20 font-bold"
                  value={editMealName}
                  onChange={(e) => setEditMealName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="pb-4">
              <Button 
                onClick={handleUpdateMeal} 
                disabled={!editMealName}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              >
                Update Jadwal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                Total: {totalCalories} kcal
              </Badge>
            </div>

            <div className="space-y-5">
              {isLoadingMeals ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : scheduledMeals && scheduledMeals.length > 0 ? (
                scheduledMeals.map((meal) => (
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
                                <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{meal.calories} kcal • Personalized for you</p>
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
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenEdit(meal)}
                              className="text-muted-foreground hover:text-primary rounded-full hover:bg-primary/5 h-9 w-9"
                             >
                                <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteMeal(meal.id, meal.name)}
                              className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/5 h-9 w-9"
                             >
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
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted">
                  <Utensils className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-bold">Belum ada makanan yang dijadwalkan.</p>
                  <p className="text-xs text-muted-foreground">Klik "+ Add Meal" untuk memulai.</p>
                </div>
              )}
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
