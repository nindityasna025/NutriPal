"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { Loader2, Calculator, Scale, Ruler, Heart, User, Calendar } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function OnboardingPage() {
  const firestore = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "">("")
  const [bmi, setBmi] = useState<number | null>(null)
  const [category, setCategory] = useState("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState("")

  useEffect(() => {
    if (weight && height) {
      const w = parseFloat(weight)
      const h = parseFloat(height) / 100
      if (w > 0 && h > 0) {
        const val = w / (h * h)
        setBmi(val)
        if (val < 18.5) setCategory("Underweight")
        else if (val < 25) setCategory("Ideal")
        else if (val < 30) setCategory("Overweight")
        else setCategory("Obese")
      }
    }
  }, [weight, height])

  const calculateCalorieTarget = (w: number, h: number, a: number, g: "male" | "female", cat: string) => {
    let bmr = (10 * w) + (6.25 * h) - (5 * a)
    if (g === "male") bmr += 5
    else bmr -= 161
    const tdee = bmr * 1.2
    if (cat === "Obese" || cat === "Overweight") return Math.round(tdee - 500)
    if (cat === "Underweight") return Math.round(tdee + 500)
    return Math.round(tdee)
  }

  const handleFinish = async () => {
    if (!user || !weight || !height || !gender || !age) return
    setLoading(true)
    try {
      const w = parseFloat(weight)
      const h = parseFloat(height)
      const a = parseInt(age)
      
      const calorieTarget = calculateCalorieTarget(w, h, a, gender, category)

      const profileData = {
        gender,
        age: a,
        weight: w,
        height: h,
        bmi,
        bmiCategory: category,
        dietaryRestrictions: restrictions,
        allergies,
        calorieTarget,
        proteinTarget: 30,
        carbsTarget: 40,
        fatTarget: 30,
        onboardedAt: new Date().toISOString()
      }
      
      await setDoc(doc(firestore, "users", user.uid), { 
        onboarded: true, 
        email: user.email 
      }, { merge: true })
      
      await setDoc(doc(firestore, "users", user.uid, "profile", "main"), profileData)
      router.push("/")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:py-6 space-y-4 animate-in fade-in duration-700">
      <header className="text-center space-y-1">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Personalize</h1>
        <p className="text-[9px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Bio-Metric Integration</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden flex flex-col justify-center bg-white min-h-[140px]">
          <CardContent className="p-5 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <User className="w-3 h-3 text-primary" /> Biological Sex
            </Label>
            <RadioGroup 
              value={gender} 
              onValueChange={(val) => setGender(val as "male" | "female")} 
              className="flex gap-2"
            >
              <Label
                htmlFor="male"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-3 hover:bg-secondary cursor-pointer transition-all",
                  gender === "male" ? "border-primary bg-primary/5" : ""
                )}
              >
                <RadioGroupItem value="male" id="male" className="sr-only" />
                <span className="text-xl mb-1">👨</span>
                <span className="font-black uppercase text-[8px] tracking-widest">Male</span>
              </Label>
              <Label
                htmlFor="female"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-3 hover:bg-secondary cursor-pointer transition-all",
                  gender === "female" ? "border-primary bg-primary/5" : ""
                )}
              >
                <RadioGroupItem value="female" id="female" className="sr-only" />
                <span className="text-xl mb-1">👩</span>
                <span className="font-black uppercase text-[8px] tracking-widest">Female</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-primary/5 flex flex-col justify-center min-h-[140px]">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-1">
            {bmi ? (
              <div className="animate-in zoom-in duration-300 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground opacity-60">BMI SCORE</p>
                <p className="text-4xl font-black text-primary tracking-tighter">{bmi.toFixed(1)}</p>
                <Badge className="bg-primary text-foreground font-black px-3 py-0.5 rounded-lg uppercase text-[8px] tracking-widest border-none">
                  {category}
                </Badge>
              </div>
            ) : (
              <div className="opacity-20 flex flex-col items-center">
                <Calculator className="w-8 h-8 mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest text-foreground">Awaiting Data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-6 space-y-5">
          <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Calculator className="w-3 h-3 text-primary" /> Body Dimensions
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age</Label>
              <div className="relative">
                <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                <Calendar className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Weight (kg)</Label>
              <div className="relative">
                <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                <Scale className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Height (cm)</Label>
              <div className="relative">
                <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                <Ruler className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Heart className="w-3 h-3 text-primary" /> Health Markers
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Diabetes", "Hypertension", "Vegetarian", "Gluten-free"].map(res => (
              <div key={res} className="flex items-center space-x-2.5 p-3 bg-secondary/20 rounded-xl border border-transparent hover:border-border transition-all cursor-pointer">
                <Checkbox 
                  id={res} 
                  checked={restrictions.includes(res)} 
                  className="rounded-md h-4 w-4 border-2 border-primary/20 data-[state=checked]:bg-primary"
                  onCheckedChange={(checked) => {
                    if (checked) setRestrictions([...restrictions, res])
                    else setRestrictions(restrictions.filter(r => r !== res))
                  }}
                />
                <Label htmlFor={res} className="cursor-pointer font-black text-[9px] uppercase tracking-tight opacity-70">{res}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Food Allergies</Label>
            <Input 
              value={allergies} 
              onChange={e => setAllergies(e.target.value)} 
              placeholder="e.g. Peanuts, Shellfish..." 
              className="h-10 rounded-xl border-border bg-secondary/20 font-black text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleFinish} 
        disabled={loading || !weight || !height || !gender || !age} 
        className="w-full h-14 text-xs font-black uppercase tracking-widest rounded-[1.5rem] shadow-premium bg-primary text-foreground border-none transition-all active:scale-[0.98]"
      >
        {loading ? <Loader2 className="animate-spin mr-3 h-4 w-4" /> : null}
        Complete Profile
      </Button>
    </div>
  )
}
