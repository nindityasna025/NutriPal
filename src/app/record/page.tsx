
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  ChevronLeft,
  ScanSearch,
  ImageIcon,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  List
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp, updateDoc, getDoc } from "firebase/firestore"
import { format } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default function RecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const updateId = searchParams.get('updateId')
  const paramDateId = searchParams.get('dateId')

  const [mode, setMode] = useState<"choice" | "camera" | "gallery">("choice")
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  const [existingMeal, setExistingMeal] = useState<any | null>(null)
  
  const [selectedDate, setSelectedDate] = useState(paramDateId || format(new Date(), "yyyy-MM-dd"))
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
    if (updateId && paramDateId && user) {
      fetchExistingMeal()
    }
  }, [updateId, paramDateId, user])

  const fetchExistingMeal = async () => {
    if (!user || !updateId || !paramDateId) return
    const mealRef = doc(firestore, "users", user.uid, "dailyLogs", paramDateId, "meals", updateId)
    const snap = await getDoc(mealRef)
    if (snap.exists()) {
      setExistingMeal(snap.data())
      startCamera()
    }
  }

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
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
        video: { facingMode: 'environment', width: { ideal: 800 }, height: { ideal: 800 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Camera Error", description: "Enable camera permissions." })
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
        userGoal,
        userAllergies: profile?.allergies,
        userRestrictions: profile?.dietaryRestrictions
      })
      setResult(output)
    } catch (error: any) {
      console.error(error)
      toast({ variant: "destructive", title: "AI Analysis Failed", description: "AI service interrupted. Key rotation triggered." })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!user || !mounted || !preview) return
    
    // Skip analysis if we are updating an existing meal and just want to save the photo
    if (!updateId && !result) return

    let dateId = paramDateId || selectedDate || format(new Date(), "yyyy-MM-dd")
    let timeStr = format(new Date(), "hh:mm a").toUpperCase()
    
    if (mode === "gallery" && selectedTime) {
      const [h, m] = selectedTime.split(':')
      const hour = parseInt(h)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const h12 = hour % 12 || 12
      timeStr = `${String(h12).padStart(2, '0')}:${m} ${ampm}`
    }
    
    const dailyLogRef = doc(firestore, "users", user.uid, "dailyLogs", dateId)
    
    if (updateId) {
      // Record consumption for an existing scheduled meal - JUST UPDATE IMAGE and status
      const existingMealRef = doc(firestore, "users", user.uid, "dailyLogs", dateId, "meals", updateId);
      
      const updateData: any = {
        imageUrl: preview,
        status: "consumed" as const,
        updatedAt: serverTimestamp()
      };

      // Only overwrite nutrient data if AI analysis was actually performed
      if (result) {
        updateData.calories = result.calories;
        updateData.macros = result.macros;
        updateData.healthScore = result.healthScore;
        updateData.expertInsight = result.expertInsight;
        updateData.ingredients = result.ingredients;
        updateData.allergenWarning = result.allergenWarning || "";
        updateData.name = result.name;
      }

      await updateDoc(existingMealRef, updateData);
      
      // Update daily aggregates
      const calToInc = result ? result.calories : (existingMeal?.calories || 0);
      const protToInc = result ? result.macros.protein : (existingMeal?.macros?.protein || 0);
      const carbToInc = result ? result.macros.carbs : (existingMeal?.macros?.carbs || 0);
      const fatToInc = result ? result.macros.fat : (existingMeal?.macros?.fat || 0);

      await setDoc(dailyLogRef, { 
        date: dateId, 
        caloriesConsumed: increment(calToInc),
        proteinTotal: increment(protToInc),
        carbsTotal: increment(carbToInc),
        fatTotal: increment(fatToInc)
      }, { merge: true });

      toast({ title: "Meal Updated", description: `Record synced with photo.` })
    } else {
      // New meal log - needs AI results
      if (!result) return;
      const newMealRef = doc(collection(dailyLogRef, "meals"))
      
      const mealData = {
        name: result.name,
        calories: result.calories,
        time: timeStr,
        source: mode === "camera" ? "photo" : "gallery",
        macros: result.macros,
        healthScore: result.healthScore,
        description: result.description,
        ingredients: result.ingredients,
        expertInsight: result.expertInsight,
        allergenWarning: result.allergenWarning || "",
        status: "consumed" as const,
        imageUrl: preview, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(dailyLogRef, { 
        date: dateId, 
        caloriesConsumed: increment(result.calories),
        proteinTotal: increment(result.macros.protein),
        carbsTotal: increment(result.macros.carbs),
        fatTotal: increment(result.macros.fat)
      }, { merge: true });

      await setDoc(newMealRef, mealData);
      toast({ title: "Logged Successfully", description: `${result.name} recorded.` })
    }

    router.push("/")
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-2 space-y-2 h-[100dvh] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <header className="space-y-0.5 text-center shrink-0">
        <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-tight">
          {updateId ? "Update Photo" : "Snap Meal"}
        </h1>
        <p className="text-[7px] font-black text-foreground uppercase tracking-widest opacity-40">AI Health Scan</p>
      </header>

      {mode === "choice" && !preview && (
        <div className="grid grid-cols-2 gap-3 flex-1 items-center max-w-xl mx-auto w-full">
          <Card onClick={startCamera} className="rounded-[2rem] border-none shadow-premium bg-white cursor-pointer group p-6 flex flex-col items-center gap-4 active:scale-95 transition-all">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform border border-primary/10">
              <Camera className="w-8 h-8 text-foreground" strokeWidth={2.5} />
            </div>
            <h3 className="text-xs font-black uppercase text-foreground">Camera</h3>
          </Card>
          <Card onClick={() => fileInputRef.current?.click()} className="rounded-[2rem] border-none shadow-premium bg-white cursor-pointer group p-6 flex flex-col items-center gap-4 active:scale-95 transition-all">
            <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform border border-accent/10">
              <ImageIcon className="w-8 h-8 text-foreground" strokeWidth={2.5} />
            </div>
            <h3 className="text-sm font-black uppercase text-foreground">Gallery</h3>
          </Card>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      )}

      {(mode !== "choice" || preview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 overflow-hidden min-h-0">
          <section className="flex flex-col h-full min-h-0 gap-2">
            <Card className="rounded-[1.25rem] border-none shadow-premium bg-white p-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <Button variant="ghost" onClick={resetAll} className="h-6 px-2 text-[8px] font-black uppercase tracking-widest"><ChevronLeft className="w-3 h-3 mr-1" /> Back</Button>
                <Badge variant="secondary" className="bg-primary/10 text-foreground font-black uppercase text-[6px] px-2 py-0 rounded-full border-none">{mode.toUpperCase()}</Badge>
              </div>
              <div className="relative border border-border/50 rounded-[1rem] bg-secondary/30 flex-1 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {mode === "camera" && !preview && <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
                {preview && <Image src={preview} alt="Meal" fill className="object-cover" />}
              </div>
              <div className="mt-2 flex gap-2">
                {mode === "camera" && !preview && <Button onClick={capturePhoto} className="w-full h-9 rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary text-foreground border-none shadow-sm">CAPTURE</Button>}
                
                {preview && updateId && !result && (
                  <Button onClick={handleSave} className="w-full h-9 rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary text-foreground border-none shadow-sm">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> SYNC PHOTO
                  </Button>
                )}

                {preview && !updateId && !result && (
                  <Button onClick={handleAnalyze} disabled={analyzing} className="w-full h-9 rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary text-foreground border-none shadow-sm">
                    {analyzing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} ANALYZE
                  </Button>
                )}
                
                {preview && updateId && !result && (
                   <Button variant="ghost" onClick={handleAnalyze} disabled={analyzing} className="h-9 px-4 rounded-xl font-black text-[8px] uppercase tracking-widest text-foreground opacity-50 border border-border">
                     {analyzing ? <Loader2 className="animate-spin h-3 w-3" /> : "Re-Analyze"}
                   </Button>
                )}
              </div>
            </Card>
          </section>

          <section className="flex flex-col h-full min-h-0">
            {result ? (
              <Card className="rounded-[1.25rem] border-none shadow-premium bg-white overflow-hidden flex flex-col h-full">
                <div className="p-3 flex flex-col h-full space-y-3 overflow-y-auto no-scrollbar">
                  <div className="flex justify-between items-start border-b border-border/50 pb-1.5">
                    <div className="text-left"><h2 className="text-sm font-black uppercase text-foreground leading-tight">{result.name}</h2></div>
                    <p className="text-xl font-black text-foreground tracking-tighter">+{result.calories}<span className="text-[7px] ml-0.5 opacity-20 uppercase">kcal</span></p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-center">
                      <p className="text-[6px] font-black opacity-40 uppercase">Protein</p>
                      <p className="text-xs font-black">{(result.macros as any).protein}g</p>
                    </div>
                    <div className="p-1.5 bg-orange-50 rounded-lg text-center">
                      <p className="text-[6px] font-black opacity-40 uppercase">Carbs</p>
                      <p className="text-xs font-black">{(result.macros as any).carbs}g</p>
                    </div>
                    <div className="p-1.5 bg-accent/10 rounded-lg text-center">
                      <p className="text-[6px] font-black opacity-40 uppercase">Fat</p>
                      <p className="text-xs font-black">{(result.macros as any).fat}g</p>
                    </div>
                  </div>

                  {mode === "gallery" && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-secondary/20 rounded-lg border border-border/50">
                      <div className="space-y-0.5 text-left">
                        <label className="text-[6px] font-black uppercase opacity-40 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Date</label>
                        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-6 text-[8px] font-black bg-white rounded-md border-none focus-visible:ring-1" />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <label className="text-[6px] font-black uppercase opacity-40 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Time</label>
                        <Input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="h-6 text-[8px] font-black bg-white rounded-md border-none focus-visible:ring-1" />
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] font-bold leading-relaxed text-foreground opacity-90 bg-primary/5 p-2 rounded-lg border border-primary/10 text-left italic">"{result.expertInsight}"</p>
                  
                  {result.ingredients && result.ingredients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[7px] font-black uppercase text-foreground opacity-40 flex items-center gap-1">
                        <List className="w-2.5 h-2.5" /> Ingredients
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.ingredients.map((ing: string, i: number) => (
                          <span key={i} className="text-[8px] font-black uppercase bg-secondary/50 px-2 py-0.5 rounded-lg text-foreground opacity-60">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {result.allergenWarning && (
                    <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[8px] font-black text-destructive uppercase leading-tight">{result.allergenWarning}</p>
                    </div>
                  )}

                  <Button onClick={handleSave} className="w-full h-10 rounded-xl font-black text-[9px] bg-foreground text-white shadow-premium uppercase tracking-widest mt-auto transition-transform active:scale-95">SYNC RECORD <ChevronRight className="w-3 h-3 ml-1" /></Button>
                </div>
              </Card>
            ) : existingMeal && preview ? (
              <Card className="rounded-[1.25rem] border-none shadow-premium bg-white overflow-hidden flex flex-col h-full">
                <div className="p-3 flex flex-col h-full space-y-3 items-center justify-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-2">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Ready to Record</h3>
                  <p className="text-[10px] font-bold text-foreground opacity-50 px-4 leading-relaxed">
                    Recording consumption for <span className="text-primary">{existingMeal.name}</span>. Metadata will be preserved.
                  </p>
                  <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black text-[10px] bg-foreground text-white shadow-premium uppercase tracking-widest mt-6">
                    SAVE CONSUMPTION
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex-1 border-2 border-dashed border-border/40 rounded-[1.25rem] flex flex-col items-center justify-center p-4 text-center bg-white/50">
                <ScanSearch className="w-10 h-10 text-foreground opacity-10 mb-2" />
                <p className="text-foreground font-black uppercase text-[8px] tracking-widest opacity-20">Awaiting Analysis</p>
              </div>
            )}
          </section>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
