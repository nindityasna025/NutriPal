"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  Trophy,
  ArrowUpCircle,
  CheckCircle,
  ArrowDownCircle,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, startOfToday } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Denied",
        description: "Please enable camera permissions or upload an image instead.",
      })
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
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setFile(capturedFile);
          });
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
      const output = await analyzeMeal({
        photoDataUri: preview,
      })
      setResult(output)
    } catch (error: any) {
      console.error("Analysis failed", error)
      toast({
        variant: "destructive",
        title: "Expert Unavailable",
        description: error.message?.includes("429") 
          ? "Our AI Nutritionist is over capacity. Please try again." 
          : "Could not analyze meal.",
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
      
      toast({ title: "Meal Logged", description: `${result.name} added to your report.` })
      resetAll()
    } catch (e) {
      console.error(e)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500 pb-24 min-h-screen">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight uppercase text-foreground">Snap Your Meal</h1>
        <p className="text-muted-foreground font-medium text-sm">Log your meal with AI analysis instantly.</p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Card 
            onClick={startCamera}
            className="rounded-[2.5rem] border-none shadow-ios hover:shadow-ios-lg transition-all bg-white cursor-pointer group active:scale-[0.98]"
          >
            <CardContent className="p-10 flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black tracking-tight uppercase">Live Camera</h3>
                <p className="text-xs text-muted-foreground font-medium">Capture a fresh meal now</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[2.5rem] border-none shadow-ios hover:shadow-ios-lg transition-all bg-white cursor-pointer group active:scale-[0.98]"
          >
            <CardContent className="p-10 flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-accent/30 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-10 h-10 text-accent-foreground" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black tracking-tight uppercase">Upload Photo</h3>
                <p className="text-xs text-muted-foreground font-medium">Select from your gallery</p>
              </div>
            </CardContent>
          </Card>
          <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="space-y-6">
            <Card className="rounded-[3rem] border-none shadow-ios bg-white p-8 space-y-8">
              <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" onClick={resetAll} className="rounded-full h-10 px-4 text-xs font-black uppercase text-muted-foreground hover:bg-secondary">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary font-bold text-[10px] uppercase tracking-widest">
                  Live Sync
                </div>
              </div>

              <div className="relative border-2 border-dashed border-primary/10 rounded-[2.5rem] bg-secondary/5 aspect-square flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {mode === "camera" && !preview && (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    muted 
                    playsInline
                  />
                )}
                
                {preview && (
                  <div className="relative w-full h-full animate-in fade-in duration-300">
                    <Image src={preview} alt="Meal Preview" fill className="object-cover" />
                    {!result && (
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        onClick={resetAll} 
                        className="absolute top-4 right-4 rounded-full bg-white/90 backdrop-blur-md shadow-md"
                      >
                        <RefreshCw className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                  </div>
                )}

                {mode === "camera" && hasCameraPermission === false && (
                  <div className="p-8 text-center space-y-4">
                    <Camera className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm font-bold text-destructive">Camera blocked. Please check permissions.</p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {mode === "camera" && !preview && (
                <Button onClick={capturePhoto} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-ios-lg">
                  CAPTURE PHOTO
                </Button>
              )}
              
              {preview && (
                <Button onClick={handleAnalyze} disabled={analyzing || !!result} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-ios-lg">
                  {analyzing ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  {result ? "Analyzed" : "Expert Analysis"}
                </Button>
              )}
            </Card>
          </section>

          <section className="space-y-6">
            {result ? (
              <div className="animate-in slide-in-from-right-4 duration-500">
                <Card className="rounded-[3rem] border-none shadow-ios bg-white p-8 space-y-8">
                  <div className="flex justify-between items-start border-b border-muted/20 pb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">Nutritionist Report</span>
                      <h2 className="text-3xl font-black tracking-tight mt-1">{result.name}</h2>
                    </div>
                    <div className="text-right">
                       <p className="text-4xl font-black text-primary">+{result.calories}<span className="text-xs ml-1">kcal</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-primary/5 rounded-3xl text-center"><p className="text-[10px] font-black text-primary uppercase mb-1">PRO</p><p className="text-xl font-black">{result.macros.protein}g</p></div>
                    <div className="p-4 bg-accent/20 rounded-3xl text-center"><p className="text-[10px] font-black text-accent-foreground uppercase mb-1">CHO</p><p className="text-xl font-black">{result.macros.carbs}g</p></div>
                    <div className="p-4 bg-blue-50 rounded-3xl text-center"><p className="text-[10px] font-black text-blue-500 uppercase mb-1">FAT</p><p className="text-xl font-black">{result.macros.fat}g</p></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Trophy className="text-primary w-5 h-5" />
                         <span className="text-lg font-black uppercase">Health Score</span>
                       </div>
                       <span className="text-2xl font-black text-primary">{result.healthScore}/100</span>
                    </div>
                    <Progress value={result.healthScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Expert Summary</p>
                    <p className="text-sm font-medium leading-relaxed italic text-foreground/80">"{result.description}"</p>
                  </div>

                  <Button onClick={handleSave} className="w-full h-16 rounded-[2rem] font-black text-lg bg-foreground text-white shadow-xl">
                    Log Meal <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Card>
              </div>
            ) : (
              <div className="h-[500px] border-2 border-dashed border-muted/20 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center bg-secondary/5">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                  <Sparkles className="w-8 h-8 text-primary/20" />
                </div>
                <p className="text-muted-foreground font-black uppercase text-xs tracking-widest">Awaiting Capture</p>
                <p className="text-muted-foreground/50 text-xs font-medium mt-2 max-w-[200px]">AI Nutritionist will analyze your meal once photo is ready.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
