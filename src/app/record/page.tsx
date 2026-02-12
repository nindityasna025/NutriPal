
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  Calendar as CalendarIcon,
  Trophy,
  Info
} from "lucide-react"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, startOfToday } from "date-fns"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function RecordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  const [recordDate, setRecordDate] = useState<Date>(startOfToday())
  const { toast } = useToast()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setFilePreview(URL.createObjectURL(selected))
      setResult(null)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleAnalyze = () => {
    if (!file) return
    setAnalyzing(true)
    // Simulated AI Analysis
    setTimeout(() => {
      setResult({
        name: "Kuetiau Goreng",
        calories: 438,
        macros: { protein: 17, carbs: 74, fat: 19 },
        healthScore: 62,
        description: "This meal provides a good mix of carbohydrates from the noodles, moderate protein from egg and veggies, and some fats.",
        ingredients: ["Stir fried noodles", "Carrot", "Egg", "Bean sprouts", "Soy sauce"],
        tips: "Provides roughly 22% of your daily energy needs. Consider drinking extra water."
      })
      setAnalyzing(false)
    }, 2000)
  }

  const handleSave = async () => {
    if (!user || !result || !mounted) return
    const dateId = format(recordDate, "yyyy-MM-dd")
    const timeStr = format(new Date(), "hh:mm a")
    
    try {
      const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
      const mealRef = doc(collection(dailyLogRef, "meals"))
      
      await setDoc(dailyLogRef, { 
        date: dateId,
        caloriesConsumed: increment(result.calories)
      }, { merge: true })
      
      await setDoc(mealRef, {
        name: result.name,
        calories: result.calories,
        time: timeStr,
        source: "photo",
        macros: result.macros,
        healthScore: result.healthScore,
        description: result.description,
        ingredients: result.ingredients,
        createdAt: serverTimestamp()
      })
      
      toast({ title: "Meal Logged", description: `${result.name} added for ${format(recordDate, "PPP")}.` })
      setFile(null)
      setFilePreview(null)
      setResult(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight uppercase">Record & Recap</h1>
        <p className="text-muted-foreground font-medium text-sm">Snap your food for instant nutritional analysis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <Card className="rounded-[3rem] border-none shadow-xl bg-white p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Date of Consumption</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-2xl border-primary/20 bg-primary/5">
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {recordDate ? format(recordDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={recordDate} onSelect={(date) => date && setRecordDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div onClick={triggerFileInput} className="border-2 border-dashed border-primary/20 rounded-[2.5rem] bg-secondary/10 aspect-square relative flex flex-col items-center justify-center group cursor-pointer hover:bg-primary/5 transition-all overflow-hidden">
              <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
              {preview ? (
                <Image src={preview} alt="Meal Preview" fill className="object-cover" />
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="w-12 h-12 text-primary mx-auto" strokeWidth={1.5} />
                  <p className="font-black text-lg uppercase tracking-tight">Snap or Upload</p>
                </div>
              )}
            </div>
            
            <Button onClick={handleAnalyze} disabled={!file || analyzing || !!result} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-lg">
              {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {result ? "Analysis Ready" : "Analyze Meal"}
            </Button>
          </Card>
        </section>

        <section className="space-y-6">
          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-muted/20 pb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identified Meal</p>
                    <h2 className="text-3xl font-black tracking-tight">{result.name}</h2>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-muted-foreground uppercase">Calories</p>
                     <p className="text-4xl font-black text-primary tracking-tighter">+{result.calories}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-2xl text-center"><p className="text-[10px] font-black text-red-600 uppercase">Protein</p><p className="text-2xl font-black">{result.macros.protein}g</p></div>
                  <div className="p-4 bg-yellow-50 rounded-2xl text-center"><p className="text-[10px] font-black text-yellow-600 uppercase">Carbs</p><p className="text-2xl font-black">{result.macros.carbs}g</p></div>
                  <div className="p-4 bg-blue-50 rounded-2xl text-center"><p className="text-[10px] font-black text-blue-600 uppercase">Fat</p><p className="text-2xl font-black">{result.macros.fat}g</p></div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2"><Trophy className="text-primary w-5 h-5" /><span className="text-lg font-black uppercase tracking-tight">Health Benefit</span></div>
                     <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-primary">{result.healthScore}/100</span>
                        <Progress value={result.healthScore} className="w-24 h-2" />
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground"><Info className="w-3 h-3" /> Description</div>
                      <p className="text-sm font-medium leading-relaxed italic pr-4">"{result.description}"</p>
                    </div>
                    <div className="space-y-3">
                       <p className="text-[10px] font-black uppercase text-muted-foreground">Ingredients</p>
                       <div className="flex flex-wrap gap-2">
                          {result.ingredients.map((ing: string, i: number) => (
                            <Badge key={i} variant="secondary" className="px-4 py-1.5 rounded-xl font-bold bg-secondary/50 border-none">{ing}</Badge>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full h-16 rounded-[2rem] font-black text-lg bg-foreground text-white hover:bg-foreground/90 shadow-xl mt-4">
                  Log to Dashboard <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Card>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-muted/30 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center space-y-4">
              <Camera className="w-16 h-16 text-muted-foreground/10" strokeWidth={1} />
              <div className="space-y-1">
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Waiting for Analysis</p>
                <p className="text-muted-foreground/60 text-sm font-medium">Upload a photo to see nutritional details.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
