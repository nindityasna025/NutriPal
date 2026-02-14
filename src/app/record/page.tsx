
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
  ChevronDown,
  RefreshCw,
  ChevronLeft,
  ScanSearch,
  ImageIcon,
  Calendar as CalendarIcon,
  Heart,
  Scale,
  Leaf
} from "lucide-react"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function RecordPage() {
  const [mode, setMode] = useState<"choice" | "camera" | "gallery">("choice")
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [logTime, setLogTime] = useState<string>(format(new Date(), "HH:mm"))
  const [isInsightExpanded, setIsInsightExpanded] = useState(false)
  const { toast } = useToast()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    setMounted(true)
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
        resolve(canvas.toDataURL('image/jpeg', 0.7));
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFilePreview(canvas.toDataURL('image/jpeg'));
        stopCamera()
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMode("gallery")
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  const resetAll = () => {
    stopCamera()
    setMode("choice")
    setFilePreview(null)
    setResult(null)
    setIsInsightExpanded(false)
  }

  const handleAnalyze = async () => {
    if (!preview) return
    setAnalyzing(true)
    try {
      const compressed = await compressImage(preview);
      const output = await analyzeMeal({ photoDataUri: compressed })
      setResult(output)
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Error", description: "Could not analyze meal photo." })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!user || !result || !mounted) return
    const selectedDate = parseISO(logDate)
    const dateId = format(selectedDate, "yyyy-MM-dd")
    let timeStr = format(new Date(), "hh:mm a")
    if (mode === "gallery" && logTime) {
      const [hours, mins] = logTime.split(':')
      const d = new Date(selectedDate)
      d.setHours(parseInt(hours), parseInt(mins))
      timeStr = format(d, "hh:mm a")
    }
    
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    const mealRef = doc(collection(dailyLogRef, "meals"))
    await setDoc(dailyLogRef, { date: dateId, caloriesConsumed: increment(result.calories) }, { merge: true })
    await setDoc(mealRef, {
      name: result.name,
      calories: result.calories,
      time: timeStr,
      source: mode === "camera" ? "photo" : "gallery",
      macros: result.macros,
      healthScore: result.healthScore,
      description: result.description,
      ingredients: result.ingredients,
      healthBenefit: result.healthBenefit,
      weightGoalAdvice: result.weightGoalAdvice,
      imageUrl: preview,
      createdAt: serverTimestamp()
    })
    toast({ title: "Logged Successfully", description: `${result.name} recorded.` })
    resetAll()
  }

  if (!mounted) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Snap Meal</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">AI Expert Analysis</p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Card onClick={startCamera} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group active:scale-[0.98] overflow-hidden">
            <CardContent className="p-10 flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
                <Camera className="w-7 h-7 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-0.5">
                <h3 className="text-lg font-black tracking-tight uppercase text-foreground">Live Camera</h3>
                <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Capture Now</p>
              </div>
            </CardContent>
          </Card>

          <Card onClick={() => fileInputRef.current?.click()} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group active:scale-[0.98] overflow-hidden">
            <CardContent className="p-10 flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
                <ImageIcon className="w-7 h-7 text-accent" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-0.5">
                <h3 className="text-lg font-black tracking-tight uppercase text-foreground">Gallery</h3>
                <p className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em]">Upload File</p>
              </div>
            </CardContent>
          </Card>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
          <section className="space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-premium bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button variant="ghost" onClick={resetAll} className="rounded-full h-9 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                </Button>
                {mode === "gallery" && !result && (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-3 h-10 flex-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-full" />
                    </div>
                  </div>
                )}
              </div>
              <div className="relative border border-muted/30 rounded-[2rem] bg-secondary/10 aspect-square flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {mode === "camera" && !preview && <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
                {preview && (
                  <div className="relative w-full h-full">
                    <Image src={preview} alt="Meal" fill className="object-cover" />
                    {!result && (
                      <Button variant="secondary" size="icon" onClick={() => { setFilePreview(null); if(mode === "camera") startCamera(); else fileInputRef.current?.click(); }} className="absolute top-3 right-3 rounded-full bg-white/90 shadow-premium">
                        <RefreshCw className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {mode === "camera" && !preview && <Button onClick={capturePhoto} className="w-full h-14 rounded-2xl font-black text-sm bg-primary text-primary-foreground">CAPTURE PHOTO</Button>}
              {preview && !result && <Button onClick={handleAnalyze} disabled={analyzing} className="w-full h-14 rounded-2xl font-black text-sm bg-primary text-primary-foreground">{analyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="w-4 h-4 mr-2" />}{analyzing ? "ANALYZING..." : "EXPERT ANALYSIS"}</Button>}
            </Card>
          </section>

          <section className="space-y-6">
            {result ? (
              <Collapsible open={isInsightExpanded} onOpenChange={setIsInsightExpanded}>
                <Card className="rounded-[2.5rem] border-none shadow-premium bg-white overflow-hidden transition-all duration-300">
                  <CollapsibleTrigger asChild>
                    <div className="p-6 sm:p-8 space-y-8 cursor-pointer group active:scale-[0.99] transition-all">
                      <div className="flex justify-between items-start border-b border-muted/20 pb-6">
                        <div className="space-y-1 flex-1 pr-4">
                          <span className="text-[9px] font-black uppercase text-primary tracking-widest opacity-60">Analysis Result</span>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{result.name}</h2>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">+{result.calories}<span className="text-[9px] ml-1 uppercase opacity-40">kcal</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-4 bg-primary/5 rounded-[1.5rem] text-center"><p className="text-[8px] font-black text-primary uppercase mb-1">Pro</p><p className="text-lg font-black">{result.macros.protein}g</p></div>
                        <div className="p-4 bg-accent/20 rounded-[1.5rem] text-center"><p className="text-[8px] font-black text-accent-foreground uppercase mb-1">Cho</p><p className="text-lg font-black">{result.macros.carbs}g</p></div>
                        <div className="p-4 bg-blue-50 rounded-[1.5rem] text-center"><p className="text-[8px] font-black text-blue-500 uppercase mb-1">Fat</p><p className="text-lg font-black">{result.macros.fat}g</p></div>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-secondary/20 rounded-[1.5rem] transition-all group-hover:bg-secondary/30">
                         <p className="text-[12px] font-bold leading-relaxed italic text-foreground/80 flex-1 mr-4 line-clamp-2">"{result.description}"</p>
                         <ChevronDown className={cn("w-5 h-5 text-primary transition-transform duration-300", isInsightExpanded ? "rotate-180" : "")} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                    <div className="px-6 sm:px-8 pb-8 pt-0 space-y-8">
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black uppercase tracking-tight">Health Score</span>
                            <span className="text-2xl font-black text-primary tracking-tighter">{result.healthScore}/100</span>
                          </div>
                          <Progress value={result.healthScore} className="h-3 rounded-full" />
                       </div>

                       <div className="grid grid-cols-1 gap-6">
                          <section className="space-y-3">
                             <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                                <Heart className="w-4 h-4" /> Health Benefit
                             </div>
                             <p className="text-xs font-medium leading-relaxed text-muted-foreground bg-primary/5 p-5 rounded-2xl border border-primary/10">
                                {result.healthBenefit}
                             </p>
                          </section>

                          <section className="space-y-3">
                             <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest">
                                <Scale className="w-4 h-4" /> Goal Alignment
                             </div>
                             <div className="p-5 bg-secondary/30 rounded-2xl border border-transparent">
                                <p className="text-[11px] font-bold leading-relaxed text-foreground/90">
                                   {result.weightGoalAdvice}
                                </p>
                             </div>
                          </section>

                          <section className="space-y-3">
                             <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                                <Leaf className="w-4 h-4" /> Ingredients
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {result.ingredients.map((ing, i) => (
                                  <Badge key={i} variant="outline" className="rounded-xl border-muted-foreground/10 text-muted-foreground px-3 py-1 font-bold text-[9px] uppercase">
                                    {ing}
                                  </Badge>
                                ))}
                             </div>
                          </section>
                       </div>
                       
                       <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black text-sm bg-foreground text-white shadow-premium mt-4">
                         LOG TO DAILY RECORD <ChevronRight className="w-4 h-4 ml-2" />
                       </Button>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ) : (
              <div className="h-[300px] border border-dashed border-border/40 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center bg-white/30 backdrop-blur-sm">
                <ScanSearch className="w-12 h-12 text-primary/10 mb-6" />
                <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em]">Awaiting Content</p>
              </div>
            )}
          </section>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
