
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useUser } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { Loader2, Calculator, Scale, Ruler, Heart } from "lucide-react"

export default function OnboardingPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
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
    if (!user) return
    setLoading(true)
    try {
      const profileData = {
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
    <div className="max-w-xl mx-auto p-4 md:py-12 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Personalize Your Journey</h1>
        <p className="text-muted-foreground">Let NutriPal tailor your nutrition plan to your unique needs.</p>
      </header>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="text-primary" /> Body Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <div className="relative">
                <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className="pl-9 rounded-xl" />
                <Scale className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <div className="relative">
                <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className="pl-9 rounded-xl" />
                <Ruler className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {bmi && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex justify-between items-center animate-in fade-in zoom-in duration-300">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Your BMI</p>
                <p className="text-2xl font-black text-primary">{bmi.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-muted-foreground">Category</p>
                <p className="text-lg font-bold">{category}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Heart className="text-red-500" /> Health & Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {["Diabetes", "Hypertension", "Vegetarian", "Gluten-free"].map(res => (
              <div key={res} className="flex items-center space-x-2 p-3 bg-secondary/30 rounded-xl">
                <Checkbox 
                  id={res} 
                  checked={restrictions.includes(res)} 
                  onCheckedChange={(checked) => {
                    if (checked) setRestrictions([...restrictions, res])
                    else setRestrictions(restrictions.filter(r => r !== res))
                  }}
                />
                <Label htmlFor={res} className="cursor-pointer">{res}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Food Allergies (if any)</Label>
            <Input 
              value={allergies} 
              onChange={e => setAllergies(e.target.value)} 
              placeholder="e.g. Peanuts, Shellfish..." 
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleFinish} disabled={loading || !weight || !height} className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-95">
        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
        Complete My Profile
      </Button>
    </div>
  )
}
