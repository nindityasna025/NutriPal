
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  RefreshCw,
  ChevronLeft,
  ScanSearch,
  ImageIcon,
  Calendar as CalendarIcon,
  Clock,
  Leaf
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"
import { Badge } from "@/components/ui/badge"

// Standardized Macro Colors - Sharp Edition
const MACRO_COLORS = {
  protein: "hsl(var(--primary))", // Forest Green Brand
  carbs: "hsl(38 92% 50%)",      // Amber
  fat: "hsl(var(--accent))",     // Lime
}

export default function RecordPage() {
  const [mode, setMode] = useState<"choice" | "camera" | "gallery">("choice")
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const [logDate, setLogDate] = useState<string>("")
  const [logTime, setLogTime] = useState<string>("")
  
  const { toast } = useToast()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  useEffect(() => {
    setMounted(true)
    const now = new Date()
    setLogDate(format(now, "yyyy-MM-dd"))
    setLogTime(format(now, "HH:mm"))
  }, [])

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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const startCamera = async () => {
    setMode("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Camera Error", description: "Enable camera permissions to use this feature." })
      setMode("choice")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawPhoto = canvas.toDataURL('image/jpeg');
        const compressed = await compressImage(rawPhoto);
        setFilePreview(compressed);
        stopCamera()
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMode("gallery")
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawPhoto = reader.result as string;
        const compressed = await compressImage(rawPhoto);
        setFilePreview(compressed);
      };
      reader.readAsDataURL(file);
    }
  }

  const resetAll = () => {
    stopCamera()
    setMode("choice")
    setFilePreview(null)
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!preview) return
    setAnalyzing(true)
    try {
      let userGoal: "Maintenance" | "Weight Loss" | "Weight Gain" = "Maintenance"
      if (profile?.bmiCategory) {
        if (profile.bmiCategory === "Overweight" || profile.bmiCategory === "Obese") userGoal = "Weight Loss"
        else if (profile.bmiCategory === "Underweight") userGoal = "Weight Gain"
      }

      const output = await analyzeMeal({ 
        photoDataUri: preview,
        userGoal
      })
      setResult(output)
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Error", description: "Could not analyze meal photo." })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!user || !result || !mounted || !preview || !logDate) return
    const selectedDate = parseISO(logDate)
    const dateId = format(selectedDate, "yyyy-MM-dd")
    
    let timeStr = format(new Date(), "hh:mm a")
    if (logTime) {
      const [hours, mins] = logTime.split(':')
      const d = new Date(selectedDate)
      d.setHours(parseInt(hours), parseInt(mins))
      timeStr = format(d, "hh:mm a")
    }
    
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealRef = doc(collection(dailyLogRef, "meals"))
    
    setDoc(dailyLogRef, { 
      date: dateId, 
      caloriesConsumed: increment(result.calories),
      proteinTotal: increment(result.macros.protein),
      carbsTotal: increment(result.macros.carbs),
      fatTotal: increment(result.macros.fat)
    }, { merge: true });

    setDoc(mealRef, {
      name: result.name,
      calories: result.calories,
      time: timeStr,
      source: mode === "camera" ? "photo" : "gallery",
      macros: result.macros,
      healthScore: result.healthScore,
      description: result.description,
      ingredients: result.ingredients,
      expertInsight: result.expertInsight,
      imageUrl: preview, 
      createdAt: serverTimestamp()
    });

    toast({ title: "Logged Successfully", description: `${result.name} recorded.` })
    resetAll()
  }

  if (!mounted) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Snap Meal</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">AI Expert Analysis</p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <Card onClick={startCamera} className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 active:scale-[0.98] overflow-hidden flex flex-col items-center gap-8">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
              <Camera className="w-10 h-10 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black tracking-tight uppercase text-foreground">Live Camera</h3>
              <p className="text-[9px] text-foreground opacity-40 font-black uppercase tracking-[0.3em]">Capture Now</p>
            </div>
          </Card>

          <Card onClick={() => fileInputRef.current?.click()} className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-12 active:scale-[0.98] overflow-hidden flex flex-col items-center gap-8">
            <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
              <ImageIcon className="w-10 h-10 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black tracking-tight uppercase text-foreground">Gallery</h3>
              <p className="text-[9px] text-foreground opacity-40 font-black uppercase tracking-[0.3em]">Upload File</p>
            </div>
          </Card>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
          <section className="space-y-8">
            <Card className="rounded-[3rem] border-none shadow-premium bg-white p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <Button variant="ghost" onClick={resetAll} className="rounded-full h-10 px-6 text-[10px] font-black uppercase tracking-widest text-foreground opacity-60 hover:bg-secondary">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                
                {(mode === "gallery" || mode === "camera") && !result && (
                  <div className="flex items-center gap-4 bg-secondary rounded-full px-6 h-12 border border-border">
                    <div className="flex items-center gap-3 border-r border-border pr-5">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <input 
                        type="date" 
                        value={logDate} 
                        onChange={e => setLogDate(e.target.value)} 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-28 text-foreground" 
                      />
                    </div>
                    <div className="flex items-center gap-3 pl-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <input 
                        type="time" 
                        value={logTime} 
                        onChange={e => setLogTime(e.target.value)} 
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-16 text-foreground" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative border border-border rounded-[2.5rem] bg-secondary/30 aspect-square flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {mode === "camera" && !preview && <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
                {preview && (
                  <div className="relative w-full h-full">
                    <Image src={preview} alt="Meal" fill className="object-cover" />
                    {!result && (
                      <Button variant="secondary" size="icon" onClick={() => { setFilePreview(null); if(mode === "camera") startCamera(); else fileInputRef.current?.click(); }} className="absolute top-5 right-5 rounded-full bg-white shadow-premium">
                        <RefreshCw className="w-5 h-5 text-foreground" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {mode === "camera" && !preview && <Button onClick={capturePhoto} className="w-full h-16 rounded-2xl font-black text-sm bg-primary text-foreground">CAPTURE PHOTO</Button>}
              {preview && !result && <Button onClick={handleAnalyze} disabled={analyzing} className="w-full h-16 rounded-2xl font-black text-sm bg-primary text-foreground">{analyzing ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : <Sparkles className="w-5 h-5 mr-3" />}{analyzing ? "ANALYZING..." : "EXPERT ANALYSIS"}</Button>}
            </Card>
          </section>

          <section className="space-y-8">
            {result ? (
              <Card className="rounded-[3rem] border-none shadow-premium bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-10 space-y-10">
                  <div className="flex justify-between items-start border-b border-border pb-8">
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-black uppercase text-foreground opacity-40 tracking-widest">Analysis Result</span>
                      <h2 className="text-2xl font-black tracking-tight leading-tight uppercase text-foreground">{result.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-foreground tracking-tighter">+{result.calories}<span className="text-[10px] ml-1 uppercase opacity-20">kcal</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 bg-primary/10 rounded-[1.5rem] text-center"><p className="text-[9px] font-black text-foreground opacity-60 uppercase mb-1">Protein</p><p className="text-xl font-black text-foreground">{result.macros.protein}g</p></div>
                    <div className="p-5 bg-orange-50 rounded-[1.5rem] text-center"><p className="text-[9px] font-black text-foreground opacity-60 uppercase mb-1">Carbs</p><p className="text-xl font-black text-foreground">{result.macros.carbs}g</p></div>
                    <div className="p-5 bg-accent/10 rounded-[1.5rem] text-center"><p className="text-[9px] font-black text-foreground opacity-60 uppercase mb-1">Fat</p><p className="text-xl font-black text-foreground">{result.macros.fat}g</p></div>
                  </div>

                  <div className="p-7 bg-secondary/50 rounded-[2rem] text-left border border-border/50">
                    <p className="text-[13px] font-black leading-relaxed italic text-foreground opacity-80">"{result.description}"</p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-tight text-foreground">Health Score</span>
                      <span className="text-3xl font-black text-foreground tracking-tighter">{result.healthScore}/100</span>
                    </div>
                    <Progress value={result.healthScore} className="h-4 rounded-full" indicatorClassName="bg-accent" />
                  </div>

                  <div className="grid grid-cols-1 gap-10">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest text-left">
                        <Sparkles className="w-5 h-5 text-primary" /> AI Expert Insight
                      </div>
                      <p className="text-[13px] font-bold leading-relaxed text-foreground opacity-80 bg-primary/10 p-7 rounded-[2rem] border border-primary/20 text-left">
                        {result.expertInsight}
                      </p>
                    </section>
                    <section className="space-y-4 text-left">
                      <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-widest">
                        <Leaf className="w-5 h-5 text-primary" /> Ingredients
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {result.ingredients.map((ing, i) => (
                          <Badge key={i} variant="outline" className="rounded-xl border-border text-foreground opacity-80 px-5 py-1.5 font-black text-[10px] uppercase">
                            {ing}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  </div>
                  
                  <Button onClick={handleSave} className="w-full h-16 rounded-2xl font-black text-sm bg-foreground text-white shadow-premium mt-6 uppercase tracking-widest">
                    Log to Daily Record <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="h-[400px] border-2 border-dashed border-border/50 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center bg-white shadow-inner">
                <ScanSearch className="w-16 h-16 text-foreground opacity-10 mb-8" />
                <p className="text-foreground font-black uppercase text-[11px] tracking-[0.3em] opacity-40">Awaiting Content</p>
              </div>
            )}
          </section>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
