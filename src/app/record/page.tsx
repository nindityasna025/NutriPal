
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
  Zap,
  ChevronRight,
  Calendar as CalendarIcon,
  Upload,
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

export default function RecordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  const [recordDate, setRecordDate] = useState<Date>(startOfToday())
  
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
    // Simulated AI Analysis with the new rich detail format
    setTimeout(() => {
      setResult({
        name: "Kuetiau Goreng",
        calories: 438,
        macros: { protein: 17, carbs: 74, fat: 19 },
        healthScore: 62,
        description: "This meal provides a good mix of carbohydrates from the noodles, moderate protein from egg and veggies, and some fats. Adding a source of lean protein next time could enhance the balance.",
        ingredients: ["Stir fried noodles", "Carrot", "Egg", "Bean sprouts", "Soy sauce"],
        tips: "Balance for Weight Maintenance: This provides roughly 22% of your daily energy needs. High in sodium, consider drinking extra water."
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
      
      alert(`Meal logged successfully for ${format(recordDate, "PPP")}!`)
      setFile(null)
      setFilePreview(null)
      setResult(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Record & Recap</h1>
        <p className="text-muted-foreground font-medium text-sm">Snap your food and get a complete nutritional analysis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white p-6 space-y-6">
            <div className="space-y-2">
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

            <div onClick={triggerFileInput} className="border-2 border-dashed border-primary/20 rounded-[2rem] bg-secondary/10 aspect-square relative flex flex-col items-center justify-center group cursor-pointer hover:bg-primary/5 transition-all overflow-hidden">
              <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
              {preview ? (
                <Image src={preview} alt="Meal Preview" fill className="object-cover" />
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="w-12 h-12 text-primary mx-auto" />
                  <p className="font-black text-lg">Snap or Upload</p>
                </div>
              )}
            </div>
            
            <Button onClick={handleAnalyze} disabled={!file || analyzing || !!result} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg">
              {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {result ? "Analysis Complete" : "Analyze Meal"}
            </Button>
          </Card>
        </section>

        <section className="space-y-6">
          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
                  <h2 className="text-3xl font-black tracking-tighter">{result.name}</h2>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-muted-foreground uppercase">Calories</p>
                   <p className="text-3xl font-black text-primary">+{result.calories}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-2xl text-center"><p className="text-[10px] font-black text-red-600 uppercase">Protein</p><p className="text-2xl font-black text-red-700">{result.macros.protein}g</p></div>
                <div className="p-4 bg-yellow-50 rounded-2xl text-center"><p className="text-[10px] font-black text-yellow-600 uppercase">Carbs</p><p className="text-2xl font-black text-yellow-700">{result.macros.carbs}g</p></div>
                <div className="p-4 bg-blue-50 rounded-2xl text-center"><p className="text-[10px] font-black text-blue-600 uppercase">Fat</p><p className="text-2xl font-black text-blue-700">{result.macros.fat}g</p></div>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 space-y-8">
                <div className="flex items-center justify-between border-b pb-6">
                   <div className="flex items-center gap-3"><Trophy className="text-primary w-6 h-6" /><span className="text-xl font-black">Health Benefit</span></div>
                   <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-primary">{result.healthScore}/100</span>
                      <Progress value={result.healthScore} className="w-24 h-2" />
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground"><Info className="w-3 h-3" /> Description</div>
                   <p className="text-sm font-medium leading-relaxed text-foreground/80 italic">"{result.description}"</p>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase text-muted-foreground">Ingredients Detected</p>
                   <div className="flex flex-wrap gap-2">
                      {result.ingredients.map((ing: string, i: number) => (
                        <Badge key={i} variant="secondary" className="px-4 py-1.5 rounded-xl font-bold bg-secondary/50">{ing}</Badge>
                      ))}
                   </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                   <p className="text-xs font-black text-primary uppercase mb-1">AI Recommendation</p>
                   <p className="text-xs font-medium text-muted-foreground">{result.tips}</p>
                </div>
              </Card>

              <Button onClick={handleSave} className="w-full h-16 rounded-[2rem] font-black text-lg bg-foreground text-white hover:bg-foreground/90 shadow-xl">
                Log to Daily Records <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
