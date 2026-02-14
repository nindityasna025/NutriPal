
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  Trophy,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  X,
  ArrowDown
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, startOfToday } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function RecordPage() {
  const [mode, setMode] = useState<"choice" | "camera" | "upload">("choice")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const { toast } = useToast()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => 
    user ? doc(firestore, "users", user.uid, "profile", "main") : null, 
    [user, firestore]
  )
  const { data: profile } = useDoc(profileRef)

  useEffect(() => {
    setMounted(true)
  }, [])

  const startCamera = async () => {
    setMode("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } } 
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Required",
        description: "Please enable camera permissions in your settings.",
      })
      setMode("choice")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        setMode("upload")
      };
      reader.readAsDataURL(selected);
      setResult(null)
      stopCamera()
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
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFilePreview(dataUrl);
        stopCamera()
      }
    }
  }

  const resetAll = () => {
    stopCamera()
    setMode("choice")
    setFile(null)
    setFilePreview(null)
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!preview) return
    setAnalyzing(true)
    try {
      const output = await analyzeMeal({ photoDataUri: preview })
      setResult(output)
    } catch (error: any) {
      console.error("Analysis failed", error)
      toast({
        variant: "destructive",
        title: "Expert Unavailable",
        description: error.message?.includes("429") 
          ? "AI Nutritionist is over capacity. Please try again." 
          : "Could not analyze meal photo.",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!user || !result || !mounted) return
    const today = startOfToday()
    const dateId = format(today, "yyyy-MM-dd")
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
      
      toast({ title: "Logged Successfully", description: `${result.name} recorded.` })
      resetAll()
    } catch (e) {
      console.error(e)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 pb-32 pt-safe min-h-screen relative">
      <header className="space-y-1 animate-in fade-in duration-700">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Snap Meal</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">
          Instant AI Expert Analysis
        </p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <Card 
            onClick={startCamera}
            className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group active:scale-[0.98] overflow-hidden"
          >
            <CardContent className="p-12 flex flex-col items-center gap-8">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Camera className="w-8 h-8 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black tracking-tight uppercase text-foreground">Live Camera</h3>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Capture Now</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[3rem] border-none shadow-premium hover:shadow-premium-lg transition-all bg-white cursor-pointer group active:scale-[0.98] overflow-hidden"
          >
            <CardContent className="p-12 flex flex-col items-center gap-8">
              <div className="w-20 h-20 bg-accent/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <ImageIcon className="w-8 h-8 text-accent-foreground" strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black tracking-tight uppercase text-foreground">Gallery</h3>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Upload Photo</p>
              </div>
            </CardContent>
          </Card>
          <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-8">
            <Card className="rounded-[3rem] border-none shadow-premium bg-white p-8 space-y-8">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={resetAll} className="rounded-full h-10 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary font-black text-[9px] uppercase tracking-widest">
                  Secure Sync
                </div>
              </div>

              <div className="relative border border-muted/30 rounded-[2.5rem] bg-secondary/10 aspect-square flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {mode === "camera" && !preview && (
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                )}
                
                {preview && (
                  <div className="relative w-full h-full animate-in fade-in duration-500">
                    <Image src={preview} alt="Meal Preview" fill className="object-cover" />
                    {!result && (
                      <Button variant="secondary" size="icon" onClick={() => setFilePreview(null)} className="absolute top-4 right-4 rounded-full bg-white/90 shadow-premium active:scale-90 transition-transform">
                        <RefreshCw className="w-5 h-5 text-primary" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {mode === "camera" && !preview && (
                <Button onClick={capturePhoto} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium-lg bg-primary text-primary-foreground">
                  CAPTURE PHOTO
                </Button>
              )}
              
              {preview && !result && (
                <Button onClick={handleAnalyze} disabled={analyzing} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium-lg bg-primary text-primary-foreground">
                  {analyzing ? <Loader2 className="animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3" />}
                  {analyzing ? "ANALYZING..." : "EXPERT ANALYSIS"}
                </Button>
              )}
            </Card>
          </section>

          <section className="space-y-8">
            {result ? (
              <div className="animate-in slide-in-from-right-8 duration-700">
                <Card className="rounded-[3rem] border-none shadow-premium bg-white p-10 space-y-10">
                  <div className="flex justify-between items-start border-b border-muted/20 pb-8">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest opacity-60">AI Nutritionist</span>
                      <h2 className="text-3xl font-black tracking-tight">{result.name}</h2>
                    </div>
                    <div className="text-right">
                       <p className="text-5xl font-black text-primary tracking-tighter">+{result.calories}<span className="text-[10px] ml-1 uppercase opacity-40">kcal</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-6 bg-primary/5 rounded-[2rem] text-center"><p className="text-[9px] font-black text-primary uppercase mb-1.5 tracking-widest">Pro</p><p className="text-2xl font-black">{result.macros.protein}g</p></div>
                    <div className="p-6 bg-accent/20 rounded-[2rem] text-center"><p className="text-[9px] font-black text-accent-foreground uppercase mb-1.5 tracking-widest">Cho</p><p className="text-2xl font-black">{result.macros.carbs}g</p></div>
                    <div className="p-6 bg-blue-50 rounded-[2rem] text-center"><p className="text-[9px] font-black text-blue-500 uppercase mb-1.5 tracking-widest">Fat</p><p className="text-2xl font-black">{result.macros.fat}g</p></div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="bg-primary/10 p-2 rounded-xl"><Trophy className="w-5 h-5 text-primary" /></div>
                         <span className="text-lg font-black uppercase tracking-tight">Health Score</span>
                       </div>
                       <span className="text-3xl font-black text-primary tracking-tighter">{result.healthScore}/100</span>
                    </div>
                    <Progress value={result.healthScore} className="h-4 rounded-full" />
                  </div>

                  <div className="space-y-3 p-6 bg-secondary/20 rounded-[2rem]">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Dietary Insight</p>
                    <p className="text-sm font-bold leading-relaxed italic text-foreground/80 opacity-90">"{result.description}"</p>
                  </div>

                  <Button onClick={handleSave} className="w-full h-16 rounded-[2rem] font-black text-xl bg-foreground text-white shadow-premium active:scale-[0.98] transition-all">
                    LOG TO DASHBOARD <ChevronRight className="w-6 h-6 ml-3" />
                  </Button>
                </Card>
              </div>
            ) : (
              <div className="h-[500px] border border-dashed border-border/40 rounded-[3rem] flex flex-col items-center justify-center p-14 text-center bg-white/30 backdrop-blur-sm">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-premium mb-8">
                  <Sparkles className="w-10 h-10 text-primary/10" />
                </div>
                <div className="space-y-3">
                  <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.3em]">Awaiting Content</p>
                  <p className="text-muted-foreground/40 text-[10px] font-black uppercase leading-relaxed max-w-[220px]">Analysis will begin as soon as a meal photo is provided</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
