
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Zap,
  ChevronRight,
  Calendar as CalendarIcon,
  Upload
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
    // Simulated AI Analysis
    setTimeout(() => {
      setResult({
        name: "Avocado & Egg Toast",
        calories: 320,
        macros: { protein: 12, carbs: 28, fat: 18 },
        quality: "High Nutritional Density",
        tips: "Excellent source of healthy fats. Try adding a squeeze of lime for better digestion."
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
        <h1 className="text-3xl font-black tracking-tighter">Record & Recap</h1>
        <p className="text-muted-foreground font-medium text-sm">Take a photo of your meal and let AI do the counting.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 bg-white overflow-hidden p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Select Record Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-bold h-12 rounded-2xl border-primary/20 bg-primary/5",
                      !recordDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {recordDate ? format(recordDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={recordDate}
                    onSelect={(date) => date && setRecordDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div 
              onClick={triggerFileInput}
              className="border-2 border-dashed border-primary/20 rounded-[2rem] bg-secondary/10 aspect-square relative flex flex-col items-center justify-center group cursor-pointer hover:bg-primary/5 transition-all overflow-hidden"
            >
              <Input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              {preview ? (
                <div className="relative w-full h-full">
                  <Image src={preview} alt="Meal Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-black text-sm uppercase tracking-widest">Change Photo</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-lg tracking-tight">Snap or Upload Photo</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">JPG, PNG up to 10MB</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-primary/30 text-primary font-black text-xs uppercase h-9 px-6 bg-white">
                    <Upload className="w-3 h-3 mr-2" /> Choose Photo
                  </Button>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleAnalyze} 
              disabled={!file || analyzing || !!result}
              className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 flex gap-2 transition-all active:scale-95"
            >
              {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {result ? "Analyzed" : "AI Photo Analysis"}
            </Button>
          </Card>
        </section>

        <section className="space-y-6">
          {!result && !analyzing && (
            <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-muted shadow-none">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                <Camera className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-bold text-lg leading-tight max-w-[250px]">
                Upload a meal photo to see the nutritional breakdown.
              </p>
            </Card>
          )}

          {analyzing && (
            <div className="space-y-6 animate-pulse">
              <div className="h-[400px] bg-white rounded-[2.5rem] border border-border flex items-center justify-center flex-col gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="font-black text-primary uppercase tracking-widest text-xs">Analyzing your meal...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-border">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">{result.name}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-[1.5rem] border border-red-100 text-center">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Protein</p>
                  <p className="text-2xl font-black text-red-700">{result.macros.protein}g</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-[1.5rem] border border-yellow-100 text-center">
                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Carbs</p>
                  <p className="text-2xl font-black text-yellow-700">{result.macros.carbs}g</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-[1.5rem] border border-blue-100 text-center">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Fat</p>
                  <p className="text-2xl font-black text-blue-700">{result.macros.fat}g</p>
                </div>
              </div>

              <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] shadow-none overflow-hidden group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Zap className="w-3 h-3 fill-primary" /> AI Nutrition Insight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm font-bold text-primary-foreground leading-relaxed italic">
                    "{result.tips}"
                  </p>
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-inner border border-primary/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Energy</span>
                      <span className="text-3xl font-black tracking-tighter">{result.calories} kcal</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-xl px-4 py-1 font-black text-[10px] uppercase">
                      {result.quality}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleSave} 
                className="w-full h-14 rounded-2xl font-black text-lg bg-foreground text-white hover:bg-foreground/90 transition-all active:scale-95 shadow-xl"
              >
                Log to Records ({format(recordDate, "MMM d")}) <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
