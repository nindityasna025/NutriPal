"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Camera, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  Calendar as CalendarIcon,
  Trophy,
  Info,
  ArrowUpCircle,
  CheckCircle,
  ArrowDownCircle,
  ScanSearch,
  RefreshCw
} from "lucide-react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, increment, collection, serverTimestamp } from "firebase/firestore"
import { format, startOfToday } from "date-fns"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { analyzeMeal, type AnalyzeMealOutput } from "@/ai/flows/analyze-meal"

const MacroInfoContent = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
      <Sparkles className="w-4 h-4" /> Macro Balance Guide
    </div>
    <p className="text-xs font-medium leading-relaxed text-foreground/80">
      This is where we break down your meal's mix of protein, carbs, and fats—the big three that keep your body fueled and feeling good.
    </p>
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-primary font-bold">Protein</span>
        <span>20-30g / 15-35% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-accent-foreground font-bold">Carbs</span>
        <span>20-30g / 40-50% daily</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase">
        <span className="text-blue-500 font-bold">Fat</span>
        <span>10-15g / 20-35% daily</span>
      </div>
    </div>
  </div>
)

export default function RecordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeMealOutput | null>(null)
  const [mounted, setMounted] = useState(false)
  const [recordDate, setRecordDate] = useState<Date>(startOfToday())
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
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
      setResult(null)
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
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
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  }

  const retakePhoto = async () => {
    setFile(null);
    setFilePreview(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setHasCameraPermission(false);
    }
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
          ? "Our AI Nutritionist is over capacity. Please wait a few seconds." 
          : "Could not analyze meal. Please try again.",
      })
    } finally {
      setAnalyzing(false)
    }
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
      retakePhoto()
    } catch (e) {
      console.error(e)
    }
  }

  const personalizedSuggestion = useMemo(() => {
    if (!profile) return null;
    const category = profile.bmiCategory || "Ideal";
    if (category === "Underweight") {
      return {
        title: "Weight Gain Target",
        goal: "Calorie Surplus Required",
        suggestion: "Your focus should be on nutrient-dense foods. Aim for higher healthy fats (Avocados, Nuts) and complex carbs to support healthy weight gain.",
        icon: <ArrowUpCircle className="text-blue-500 w-6 h-6" />,
        color: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200"
      }
    } else if (category === "Ideal") {
      return {
        title: "Maintenance Goal",
        goal: "Caloric Equilibrium",
        suggestion: "You are in the ideal zone! Maintain a balanced macro ratio (40% Carbs, 30% Protein, 30% Fat) to stay fit and energized.",
        icon: <CheckCircle className="text-primary w-6 h-6" />,
        color: "bg-primary/5",
        textColor: "text-primary",
        borderColor: "border-primary/20"
      }
    } else {
      return {
        title: "Weight Loss Goal",
        goal: "Calorie Deficit Focus",
        suggestion: "To support weight loss, prioritize lean protein to protect muscle mass while significantly reducing simple carbs and added sugars.",
        icon: <ArrowDownCircle className="text-red-500 w-6 h-6" />,
        color: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200"
      }
    }
  }, [profile]);

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500 pb-24 overflow-x-hidden">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight uppercase">Record & Recap</h1>
        <p className="text-muted-foreground font-medium text-sm">Snap your food for instant AI Expert nutritional analysis.</p>
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

            <div className="relative border-2 border-dashed border-primary/20 rounded-[2.5rem] bg-secondary/10 aspect-square flex flex-col items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                className={cn("w-full h-full object-cover", (preview || hasCameraPermission === false) && "hidden")} 
                autoPlay 
                muted 
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {preview && (
                <div className="relative w-full h-full">
                  <Image src={preview} alt="Captured Meal" fill className="object-cover" />
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={retakePhoto} 
                    className="absolute top-4 right-4 rounded-full bg-white/80 backdrop-blur-sm"
                  >
                    <RefreshCw className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              )}

              {hasCameraPermission === false && !preview && (
                <div className="text-center space-y-4 p-8">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                  <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10">
                    <AlertTitle className="font-bold">Camera Access Required</AlertTitle>
                    <AlertDescription className="text-xs">
                      Please allow camera access to use this feature, or upload a photo manually.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full">
                    Upload Manually
                  </Button>
                </div>
              )}

              <Input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
                ref={fileInputRef} 
              />
            </div>

            {hasCameraPermission && !preview && (
              <Button onClick={capturePhoto} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-lg flex gap-2">
                <Camera className="w-6 h-6" /> CAPTURE PHOTO
              </Button>
            )}
            
            {preview && (
              <Button onClick={handleAnalyze} disabled={analyzing || !!result} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-lg">
                {analyzing ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {result ? "Analysis Ready" : "Analyze Meal"}
              </Button>
            )}
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Macro Composition</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground/40 hover:text-primary">
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-6 rounded-[2rem] border-primary/20 bg-white shadow-2xl">
                        <MacroInfoContent />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl text-center"><p className="text-[10px] font-black text-primary uppercase">Protein</p><p className="text-2xl font-black">{result.macros.protein}g</p></div>
                    <div className="p-4 bg-accent/30 rounded-2xl text-center"><p className="text-[10px] font-black text-accent-foreground uppercase">Carbs</p><p className="text-2xl font-black">{result.macros.carbs}g</p></div>
                    <div className="p-4 bg-blue-50 rounded-2xl text-center"><p className="text-[10px] font-black text-blue-500 uppercase">Fat</p><p className="text-2xl font-black">{result.macros.fat}g</p></div>
                  </div>
                </div>

                {personalizedSuggestion && (
                  <div className={cn("p-6 rounded-[2rem] border space-y-4", personalizedSuggestion.color, personalizedSuggestion.borderColor)}>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         {personalizedSuggestion.icon}
                         <span className={cn("text-xs font-black uppercase tracking-widest", personalizedSuggestion.textColor)}>
                           {personalizedSuggestion.title}
                         </span>
                       </div>
                    </div>
                    <p className="text-sm font-bold leading-tight">{personalizedSuggestion.goal}</p>
                    <p className="text-xs font-medium text-foreground/70 leading-relaxed italic">
                      "{personalizedSuggestion.suggestion}"
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Trophy className="text-primary w-5 h-5" />
                       <span className="text-lg font-black uppercase tracking-tight">Health Score</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-primary">{result.healthScore}/100</span>
                        <Progress value={result.healthScore} className="w-24 h-2" />
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground"><Info className="w-3 h-3" /> Analysis Detail</div>
                      <p className="text-sm font-medium leading-relaxed italic pr-4">"{result.description}"</p>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Ingredients Detected</p>
                       </div>
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
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Waiting for Photo</p>
                <p className="text-muted-foreground/60 text-sm font-medium">Capture your meal using the live camera feed.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
