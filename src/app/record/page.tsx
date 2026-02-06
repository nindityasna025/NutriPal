
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Zap,
  ChevronRight
} from "lucide-react"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import Image from "next/image"

export default function RecordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  
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

  const handleAnalyze = () => {
    setAnalyzing(true)
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
    const now = new Date()
    const dateId = format(now, "yyyy-MM-dd")
    const timeStr = format(now, "hh:mm a")
    
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
      
      alert("Meal logged successfully!")
      setFile(null)
      setFilePreview(null)
      setResult(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Record & Recap</h1>
        <p className="text-muted-foreground">Take a photo of your meal and let AI do the counting.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <Card className="border-2 border-dashed border-primary/20 rounded-3xl bg-white overflow-hidden aspect-square relative flex items-center justify-center group cursor-pointer hover:bg-primary/5 transition-all">
            <Input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              onChange={handleFileChange}
            />
            {preview ? (
              <Image src={preview} alt="Meal Preview" fill className="object-cover" />
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Snap or Upload Photo</p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG up to 10MB</p>
                </div>
              </div>
            )}
          </Card>
          
          <Button 
            onClick={handleAnalyze} 
            disabled={!file || analyzing || !!result}
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg flex gap-2"
          >
            {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {result ? "Analyzed" : "AI Photo Analysis"}
          </Button>
        </section>

        <section className="space-y-6">
          {!result && !analyzing && (
            <div className="h-full flex items-center justify-center p-8 text-center bg-secondary/20 rounded-3xl border-2 border-dashed border-border opacity-50">
              <p className="text-sm font-medium italic">Upload a meal photo to see the nutritional breakdown.</p>
            </div>
          )}

          {analyzing && (
            <div className="space-y-6 animate-pulse">
              <div className="h-12 bg-secondary/50 rounded-xl w-3/4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-secondary/50 rounded-2xl" />
                <div className="h-20 bg-secondary/50 rounded-2xl" />
                <div className="h-20 bg-secondary/50 rounded-2xl" />
              </div>
              <div className="h-32 bg-secondary/50 rounded-3xl" />
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-headline font-black">{result.name}</h2>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase">Protein</p>
                  <p className="text-lg font-black">{result.macros.protein}g</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                  <p className="text-[10px] font-bold text-yellow-600 uppercase">Carbs</p>
                  <p className="text-lg font-black">{result.macros.carbs}g</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Fat</p>
                  <p className="text-lg font-black">{result.macros.fat}g</p>
                </div>
              </div>

              <Card className="bg-primary/5 border-primary/20 rounded-3xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 text-primary font-black uppercase"><Zap className="w-3 h-3" /> AI Nutrition Insight</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium leading-relaxed">{result.tips}</p>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-xl font-black">{result.calories} kcal</span>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-lg">{result.quality}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSave} className="w-full h-12 rounded-xl font-bold bg-foreground text-white hover:bg-foreground/90">
                Log to Daily Records <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
