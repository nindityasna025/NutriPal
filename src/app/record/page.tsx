
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
  Calendar,
  Clock
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default function RecordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"choice" | "camera" | "gallery">("choice")
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Gallery Specific States
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))
  
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
      toast({ 
        variant: "destructive", 
        title: error.message?.includes("429") ? "AI Taking a Break" : "AI Error", 
        description: error.message?.includes("429") 
          ? "Our nutritionist AI is currently over capacity. Please try again in 30 seconds." 
          : "Could not analyze meal photo." 
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!user || !result || !mounted || !preview) return
    
    let dateId = format(new Date(), "yyyy-MM-dd")
    let timeStr = format(new Date(), "hh:mm a").toUpperCase()
    
    if (mode === "gallery" && selectedDate && selectedTime) {
      dateId = selectedDate
      const [h, m] = selectedTime.split(':')
      const hour = parseInt(h)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const h12 = hour % 12 || 12
      timeStr = `${String(h12).padStart(2, '0')}:${m} ${ampm}`
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
      status: "consumed",
      imageUrl: preview, 
      createdAt: serverTimestamp()
    });

    toast({ title: "Logged Successfully", description: `${result.name} recorded.` })
    
    if (mode === "camera") {
      router.push("/")
    } else {
      resetAll()
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4 pb-20 h-[calc(100vh-theme(spacing.20))] flex flex-col overflow-hidden animate-in fade-in duration-700">
      <header className="space-y-1 text-center shrink-0">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Snap Meal</h1>
        <p className="text-[9px] font-black text-foreground uppercase tracking-widest opacity-40">Expert AI Analysis</p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-2 gap-4 flex-1 items-center max-w-2xl mx-auto w-full">
          <Card onClick={startCamera} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-8 active:scale-95 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
              <Camera className="w-8 h-8 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black tracking-tight uppercase text-foreground">Camera</h3>
              <p className="text-[8px] text-foreground opacity-40 font-black uppercase tracking-widest">Live</p>
            </div>
          </Card>

          <Card onClick={() => fileInputRef.current?.click()} className="rounded-[2.5rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group p-8 active:scale-95 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-accent/20 rounded-[1.5rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
              <ImageIcon className="w-8 h-8 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black tracking-tight uppercase text-foreground">Gallery</h3>
              <p className="text-[8px] text-foreground opacity-40 font-black uppercase tracking-widest">Upload</p>
            </div>
          </Card>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
          <section className="flex flex-col h-full min-h-0">
            <Card className="rounded-[2rem] border-none shadow-premium bg-white p-4 space-y-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <Button variant="ghost" onClick={resetAll} className="h-8 px-4 text-[9px] font-black uppercase tracking-widest text-foreground opacity-60">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Badge variant="secondary" className="bg-primary/10 text-foreground font-black uppercase text-[7px] tracking-widest px-3 py-1 rounded-full border-none">
                  {mode.toUpperCase()} MODE
                </Badge>
              </div>

              <div className="relative border-2 border-border/50 rounded-[1.5rem] bg-secondary/30 flex-1 flex flex-col items-center justify-center overflow-hidden shadow-inner min-h-0">
                {mode === "camera" && !preview && <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
                {preview && (
                  <div className="relative w-full h-full">
                    <Image src={preview} alt="Meal" fill className="object-cover" />
                    {!result && (
                      <Button variant="secondary" size="icon" onClick={() => { setFilePreview(null); if(mode === "camera") startCamera(); else fileInputRef.current?.click(); }} className="absolute top-4 right-4 rounded-full bg-white shadow-premium h-8 w-8">
                        <RefreshCw className="w-4 h-4 text-foreground" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="shrink-0 space-y-2">
                {mode === "camera" && !preview && <Button onClick={capturePhoto} className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary text-foreground border-none">CAPTURE</Button>}
                {preview && !result && <Button onClick={handleAnalyze} disabled={analyzing} className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary text-foreground border-none">{analyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="w-4 h-4 mr-2" />}{analyzing ? "ANALYZING..." : "ANALYZE"}</Button>}
              </div>
            </Card>
          </section>

          <section className="flex flex-col h-full min-h-0">
            {result ? (
              <Card className="rounded-[2rem] border-none shadow-premium bg-white overflow-hidden flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
                <div className="p-6 flex flex-col h-full space-y-6 overflow-y-auto no-scrollbar">
                  <div className="flex justify-between items-start border-b border-border pb-4 shrink-0">
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] font-black uppercase text-foreground opacity-40 tracking-widest">Result</span>
                      <h2 className="text-xl font-black tracking-tight leading-none uppercase text-foreground">{result.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-foreground tracking-tighter">+{result.calories}<span className="text-[9px] ml-1 uppercase opacity-20">kcal</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl text-center border border-primary/5">
                      <p className="text-[7px] font-black text-foreground opacity-40 uppercase">Protein</p>
                      <p className="text-lg font-black text-foreground">{result.macros.protein}g</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-xl text-center border border-orange-100/50">
                      <p className="text-[7px] font-black text-foreground opacity-40 uppercase">Carbs</p>
                      <p className="text-lg font-black text-foreground">{result.macros.carbs}g</p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded-xl text-center border border-accent/5">
                      <p className="text-[7px] font-black text-foreground opacity-40 uppercase">Fat</p>
                      <p className="text-lg font-black text-foreground">{result.macros.fat}g</p>
                    </div>
                  </div>

                  {mode === "gallery" && (
                    <div className="grid grid-cols-2 gap-3 p-4 bg-secondary/20 rounded-xl border border-border/50 shrink-0">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase opacity-40 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Date</label>
                        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-8 text-[9px] font-black rounded-lg border-border bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase opacity-40 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Time</label>
                        <Input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="h-8 text-[9px] font-black rounded-lg border-border bg-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    <section className="space-y-2">
                      <div className="flex items-center gap-2 text-foreground font-black text-[9px] uppercase tracking-widest text-left">
                        <Sparkles className="w-4 h-4 text-primary" /> Expert Insight
                      </div>
                      <p className="text-[11px] font-bold leading-relaxed text-foreground opacity-90 bg-primary/5 p-4 rounded-xl border border-primary/10 text-left italic">
                        "{result.expertInsight}"
                      </p>
                    </section>
                  </div>
                  
                  <Button onClick={handleSave} className="w-full h-14 rounded-xl font-black text-[11px] bg-foreground text-white shadow-premium shrink-0 uppercase tracking-widest hover:bg-foreground/90 active:scale-95 transition-all">
                    LOG RECORD <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex-1 border-2 border-dashed border-border/40 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center bg-white/50 shadow-inner">
                <ScanSearch className="w-16 h-16 text-foreground opacity-10 mb-6" />
                <p className="text-foreground font-black uppercase text-[10px] tracking-widest opacity-20">Awaiting Capture</p>
              </div>
            )}
          </section>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

