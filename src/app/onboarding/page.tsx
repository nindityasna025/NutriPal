
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { Loader2, Calculator, Scale, Ruler, Heart, User } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export default function OnboardingPage() {
  const firestore = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
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

  const handleFinish = async () => {
    if (!user || !weight || !height || !gender) return
    setLoading(true)
    try {
      const profileData = {
        gender,
        weight: parseFloat(weight),
        height: parseFloat(height),
        bmi,
        bmiCategory: category,
        dietaryRestrictions: restrictions,
        allergies,
        calorieTarget: category === "Ideal" ? 2000 : category === "Obese" ? 1800 : 2500
      }
      
      await setDoc(doc(firestore, "users", user.uid), { onboarded: true, email: user.email }, { merge: true })
      await setDoc(doc(firestore, "users", user.uid, "profile", "main"), profileData)
      
      router.push("/")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:py-12 space-y-8 animate-in fade-in duration-700">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Personalize Your Journey</h1>
        <p className="text-muted-foreground">Let NutriPal tailor your nutrition plan to your unique needs.</p>
      </header>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-primary">
            <User className="w-5 h-5" /> Biological Sex
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <RadioGroup 
            value={gender} 
            onValueChange={(val) => setGender(val as "male" | "female")} 
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="male"
              className={cn(
                "flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                gender === "male" ? "border-primary bg-primary/5" : ""
              )}
            >
              <RadioGroupItem value="male" id="male" className="sr-only" />
              <span className="text-2xl mb-1">👨</span>
              <span className="font-black uppercase text-[10px] tracking-widest">Male</span>
            </Label>
            <Label
              htmlFor="female"
              className={cn(
                "flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                gender === "female" ? "border-primary bg-primary/5" : ""
              )}
            >
              <RadioGroupItem value="female" id="female" className="sr-only" />
              <span className="text-2xl mb-1">👩</span>
              <span className="font-black uppercase text-[10px] tracking-widest">Female</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-primary">
            <Calculator className="w-5 h-5" /> Body Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Weight (kg)</Label>
              <div className="relative">
                <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className="pl-10 h-12 rounded-2xl border-primary/10 font-bold" />
                <Scale className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Height (cm)</Label>
              <div className="relative">
                <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className="pl-10 h-12 rounded-2xl border-primary/10 font-bold" />
                <Ruler className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
              </div>
            </div>
          </div>

          {bmi && (
            <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/20 flex justify-between items-center animate-in fade-in zoom-in duration-500">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Calculated BMI</p>
                <p className="text-4xl font-black text-primary tracking-tighter">{bmi.toFixed(1)}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Health Category</p>
                <Badge className="bg-primary text-primary-foreground hover:bg-primary font-black px-4 py-1.5 rounded-xl uppercase text-[10px] tracking-widest border-none">
                  {category}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-primary">
            <Heart className="w-5 h-5" /> Health & Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {["Diabetes", "Hypertension", "Vegetarian", "Gluten-free"].map(res => (
              <div key={res} className="flex items-center space-x-3 p-4 bg-secondary/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all cursor-pointer group">
                <Checkbox 
                  id={res} 
                  checked={restrictions.includes(res)} 
                  className="rounded-lg h-5 w-5 border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  onCheckedChange={(checked) => {
                    if (checked) setRestrictions([...restrictions, res])
                    else setRestrictions(restrictions.filter(r => r !== res))
                  }}
                />
                <Label htmlFor={res} className="cursor-pointer font-bold text-sm tracking-tight">{res}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Food Allergies (if any)</Label>
            <Input 
              value={allergies} 
              onChange={e => setAllergies(e.target.value)} 
              placeholder="e.g. Peanuts, Shellfish..." 
              className="h-12 rounded-2xl border-primary/10 font-bold"
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleFinish} 
        disabled={loading || !weight || !height || !gender} 
        className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-[2rem] shadow-xl shadow-primary/20 transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {loading ? <Loader2 className="animate-spin mr-3" /> : null}
        Complete My Profile
      </Button>
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
