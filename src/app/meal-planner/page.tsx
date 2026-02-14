"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Utensils, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  ChevronRightIcon,
  Edit2,
  ChefHat,
  Camera,
  X
} from "lucide-react"
import { format, addDays, subDays, startOfToday } from "date-fns"
import Link from "next/link"
import { generateRecipe } from "@/ai/flows/generate-recipe"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, updateDoc, setDoc, deleteDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import Image from "next/image"
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
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [mealName, setMealName] = useState("")
  const [mealType, setMealType] = useState("Breakfast")
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [mealImageUrl, setMealImageUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [generatingRecipe, setGeneratingRecipe] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null)
  const [activeRecipeName, setActiveRecipeName] = useState("")

  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setMounted(true)
  }, [])

  const dateId = date ? format(date, "yyyy-MM-dd") : ""
  
  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const mealsColRef = useMemoFirebase(() => (user && dateId) ? collection(firestore, "users", user.uid, "dailyLogs", dateId, "meals") : null, [user, firestore, dateId])

  const { data: profile } = useDoc(profileRef)
  const { data: scheduledMeals, isLoading: isLoadingMeals } = useCollection(mealsColRef)

  const handlePrevDay = () => date && setDate(subDays(date, 1))
  const handleNextDay = () => date && setDate(addDays(date, 1))
  const handleToday = () => setDate(startOfToday())

  const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const rawPhoto = reader.result as string;
        const compressed = await compressImage(rawPhoto);
        setMealImageUrl(compressed);
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMeal = async () => {
    if (!user || !mealsColRef || !mealName) return
    setIsSaving(true)
    
    const timeMap: Record<string, string> = { "Breakfast": "08:30 AM", "Lunch": "01:00 PM", "Snack": "04:00 PM", "Dinner": "07:30 PM" }
    const mealData = {
      name: mealName,
      type: mealType,
      time: timeMap[mealType] || "12:00 PM",
      calories: 450,
      macros: { protein: 25, carbs: 45, fat: 15 },
      healthScore: 85,
      description: "Custom meal scheduled for peak metabolic performance.",
      source: "planner",
      reminderEnabled,
      imageUrl: mealImageUrl,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingMealId) {
        await updateDoc(doc(mealsColRef, editingMealId), mealData);
        toast({ title: "Schedule Updated", description: "Your daily plan has been refined." })
      } else {
        await setDoc(doc(mealsColRef), { ...mealData, createdAt: serverTimestamp() });
        toast({ title: "Meal Scheduled", description: `${mealName} is now on your timeline.` })
      }
      resetForm()
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Save Error", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  const resetForm = () => {
    setMealName("")
    setEditingMealId(null)
    setMealImageUrl(null)
    setIsDialogOpen(false)
    setIsSaving(false)
  }

  const openEditDialog = (meal: any) => {
    setEditingMealId(meal.id)
    setMealName(meal.name)
    setMealType(meal.type || "Breakfast")
    setReminderEnabled(!!meal.reminderEnabled)
    setMealImageUrl(meal.imageUrl || null)
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = async (mealId: string, mealName: string) => {
    if (!user || !mealsColRef) return
    try {
      await deleteDoc(doc(mealsColRef, mealId));
      toast({ variant: "destructive", title: "Meal Removed", description: `${mealName} taken off your schedule.` })
    } catch (err: any) {
      console.error(err);
    }
  }

  const handleGetRecipe = async (mealName: string) => {
    setActiveRecipeName(mealName)
    setGeneratingRecipe(true)
    setIsRecipeDialogOpen(true)
    try {
      const result = await generateRecipe({ mealName, dietaryRestrictions: profile?.dietaryRestrictions || [] })
      setActiveRecipe(result.recipe)
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Error", description: "Could not fetch recipe instructions." })
      setIsRecipeDialogOpen(false)
    } finally {
      setGeneratingRecipe(false)
    }
  }

  if (!mounted || !date) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <div className="space-y-1 w-full lg:w-auto">
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Plan</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Strategic Daily Menu</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
          <Button variant="outline" onClick={handleToday} className="rounded-full h-11 px-6 font-black uppercase text-[9px] tracking-widest border-border shadow-sm hover:bg-secondary/50 transition-all">
            Today
          </Button>
          
          <div className="flex items-center bg-white rounded-full border border-border shadow-sm p-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-4 font-black text-[10px] uppercase tracking-widest min-w-[140px] text-center">{format(date, "EEEE, MMM d")}</div>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9 rounded-full hover:bg-secondary/50"><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw] max-w-lg">
              <DialogHeader className="bg-primary p-8 text-primary-foreground text-center">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                  {editingMealId ? "Refine Meal" : "New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="grid gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Timing</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="h-12 rounded-[1.25rem] font-bold border-muted-foreground/10">
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
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Description</Label>
                    <Input placeholder="e.g. Grilled Salmon" className="h-12 rounded-[1.25rem] font-bold border-primary/10" value={mealName} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Image (Optional)</Label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-primary/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-all aspect-video relative overflow-hidden"
                    >
                      {mealImageUrl ? (
                        <>
                          <Image src={mealImageUrl} alt="Meal Preview" fill className="object-cover" />
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 rounded-full h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setMealImageUrl(null); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-primary/20 mb-2" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Click to upload photo</p>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>

                  <div className="flex items-center justify-between p-5 bg-secondary/30 rounded-[1.5rem]">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Smart Alerts</Label>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase">Notify 15m before meal time.</p>
                    </div>
                    <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-8 pt-0">
                <Button onClick={handleSaveMeal} disabled={!mealName || isSaving} className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-premium">
                  {isSaving ? <Loader2 className="animate-spin" /> : editingMealId ? "Sync Changes" : "Confirm Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-lg font-black tracking-tight px-1 uppercase text-left">Your Schedule</h2>
        <div className="space-y-4">
          {isLoadingMeals ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : scheduledMeals && scheduledMeals.length > 0 ? (
              scheduledMeals.map((meal) => (
                <Card key={meal.id} className="border-none shadow-premium hover:shadow-premium-lg transition-all rounded-[2.5rem] overflow-hidden bg-white">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-8 flex-1">
                         <div className="text-center min-w-[100px] border-r pr-8 border-border hidden sm:block">
                           <p className="text-xl font-black text-primary/40 leading-none">{meal.time}</p>
                         </div>
                         <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-4">
                              {meal.imageUrl && (
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0 border border-muted/20">
                                  <Image src={meal.imageUrl} alt={meal.name} fill className="object-cover" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-xl font-black tracking-tight uppercase leading-tight">{meal.name}</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+{meal.calories} KCAL</p>
                                   <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] font-black uppercase text-red-500">{meal.macros?.protein}g Protein</span></div>
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-[10px] font-black uppercase text-yellow-600">{meal.macros?.carbs}g Carbs</span></div>
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] font-black uppercase text-blue-500">{meal.macros?.fat}g Fat</span></div>
                                   </div>
                                </div>
                              </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                         {meal.source === 'planner' && (
                           <Button variant="ghost" size="icon" onClick={() => handleGetRecipe(meal.name)} className="text-primary hover:bg-primary/10 rounded-xl h-10 w-10 border border-primary/10 shadow-sm"><ChefHat className="w-5 h-5" /></Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)} className="text-muted-foreground hover:bg-secondary rounded-xl h-10 w-10 border border-border/50"><Edit2 className="w-4 h-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id, meal.name)} className="text-muted-foreground hover:text-destructive rounded-xl h-10 w-10 border border-border/50"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-24 bg-white/40 rounded-[3rem] border-2 border-dashed border-muted/30 flex flex-col items-center justify-center shadow-sm px-8">
                <Utensils className="w-16 h-16 mb-4 text-muted-foreground/10" />
                <p className="text-muted-foreground font-black text-lg uppercase tracking-tight">Your timeline is clear.</p>
                <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest mt-1">Plan a meal or ask the AI for a decision relief below.</p>
              </div>
            )}
        </div>
      </section>

      <section className="pt-6">
        <Link href="/planner">
          <Card className="rounded-[3rem] bg-primary/10 border-none text-foreground shadow-premium overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] border-2 border-primary/20">
            <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-8 flex-1">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-premium shrink-0">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.3em] opacity-80 mb-0.5">Feeling Indecisive?</p>
                  <h3 className="text-2xl font-black uppercase leading-tight">AI Decision Hub</h3>
                  <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-relaxed max-w-sm">
                    Let AI analyze delivery deals or curate a BMR-matched menu instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary text-primary-foreground px-6 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                Explore AI Hub <ChevronRightIcon className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-premium-lg bg-background w-[92vw]">
          <DialogHeader className="bg-primary p-6 sm:p-8 text-primary-foreground">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-tight">
              {activeRecipeName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <ScrollArea className="h-[350px] pr-4">
              {generatingRecipe ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Formulating instructions...</p>
                </div>
              ) : activeRecipe ? (
                <div className="prose prose-sm prose-green max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed font-bold text-foreground/80 text-sm">
                    {activeRecipe}
                  </div>
                </div>
              ) : null}
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-0">
             <Button onClick={() => setIsRecipeDialogOpen(false)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-premium">Return to Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
