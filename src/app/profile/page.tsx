
"use client"

import { useState, useEffect } from "react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { doc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  LogOut, 
  ShieldCheck, 
  Smartphone, 
  Scale, 
  Activity,
  ChevronRight,
  Edit2,
  Loader2,
  Bell,
  User,
  Calculator,
  Calendar,
  Ruler,
  Heart
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ProfilePage() {
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit States
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "">("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState("")
  const [notifs, setNotifs] = useState(false)
  
  const [bmi, setBmi] = useState<number | null>(null)
  const [category, setCategory] = useState("")

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight?.toString() || "")
      setHeight(profile.height?.toString() || "")
      setAge(profile.age?.toString() || "")
      setGender(profile.gender || "")
      setNotifs(!!profile.notificationsEnabled)
      setRestrictions(profile.dietaryRestrictions || [])
      setAllergies(profile.allergies || "")
    }
  }, [profile, isEditDialogOpen])

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

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const handleUpdateProfile = async () => {
    if (!user || !profileRef || !gender) return
    setLoading(true)
    try {
      const w = parseFloat(weight)
      const h = parseFloat(height)
      const a = parseInt(age)
      const calorieTarget = calculateCalorieTarget(w, h, a, gender as "male" | "female", category)

      updateDocumentNonBlocking(profileRef, {
        gender,
        age: a,
        weight: w,
        height: h,
        bmi,
        bmiCategory: category,
        dietaryRestrictions: restrictions,
        allergies,
        calorieTarget,
        notificationsEnabled: notifs,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Profile Updated", description: "Health metrics have been synced." })
      setIsEditDialogOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
        <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Profile</h1>
        <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Manage Your Health Metrics</p>
      </header>

      <section className="space-y-10">
        <div className="flex flex-col items-center text-center space-y-6 pt-2">
          <div className="relative">
            <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white shadow-premium">
              <AvatarImage src={user.photoURL || ""} />
              <AvatarFallback className="bg-primary text-foreground text-3xl font-black uppercase">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="absolute bottom-0 right-0 rounded-full h-9 w-9 p-0 border-white bg-primary text-foreground shadow-premium">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-[3rem] p-0 border-none bg-background w-[94vw] md:left-[calc(50%+8rem)] max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="p-8 pb-4 shrink-0 bg-primary rounded-t-[3rem]">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-center text-foreground">Update Health Profile</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="p-8 space-y-6">
                    {/* Bio Section */}
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
                              htmlFor="male-edit"
                              className={cn(
                                "flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-3 hover:bg-secondary cursor-pointer transition-all",
                                gender === "male" ? "border-primary bg-primary/5" : ""
                              )}
                            >
                              <RadioGroupItem value="male" id="male-edit" className="sr-only" />
                              <span className="text-xl mb-1">👨</span>
                              <span className="font-black uppercase text-[8px] tracking-widest">Male</span>
                            </Label>
                            <Label
                              htmlFor="female-edit"
                              className={cn(
                                "flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-3 hover:bg-secondary cursor-pointer transition-all",
                                gender === "female" ? "border-primary bg-primary/5" : ""
                              )}
                            >
                              <RadioGroupItem value="female" id="female-edit" className="sr-only" />
                              <span className="text-xl mb-1">👩</span>
                              <span className="font-black uppercase text-[8px] tracking-widest">Female</span>
                            </Label>
                          </RadioGroup>
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-primary/5 flex flex-col justify-center min-h-[140px]">
                        <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-1">
                          {bmi ? (
                            <div className="animate-in zoom-in duration-300 space-y-1 text-center">
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

                    {/* Dimensions Section */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                      <CardContent className="p-6 space-y-5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                          <Calculator className="w-3 h-3 text-primary" /> Body Dimensions
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5 text-left">
                            <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age</Label>
                            <div className="relative">
                              <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                              <Calendar className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
                            </div>
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Weight (kg)</Label>
                            <div className="relative">
                              <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                              <Scale className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
                            </div>
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Height (cm)</Label>
                            <div className="relative">
                              <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="--" className="pl-8 h-10 rounded-xl border-border bg-secondary/20 font-black text-xs" />
                              <Ruler className="absolute left-2.5 top-3 w-3.5 h-3.5 text-primary opacity-50" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Health Markers & Allergies Section */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                      <CardContent className="p-6 space-y-5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                          <Heart className="w-3 h-3 text-primary" /> Health Markers
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Diabetes", "Hypertension", "Vegetarian", "Gluten-free"].map(res => (
                            <div key={res} className="flex items-center space-x-2.5 p-3 bg-secondary/20 rounded-xl border border-transparent hover:border-border transition-all cursor-pointer">
                              <Checkbox 
                                id={`edit-${res}`} 
                                checked={restrictions.includes(res)} 
                                className="rounded-md h-4 w-4 border-2 border-primary/20 data-[state=checked]:bg-primary"
                                onCheckedChange={(checked) => {
                                  if (checked) setRestrictions([...restrictions, res])
                                  else setRestrictions(restrictions.filter(r => r !== res))
                                }}
                              />
                              <Label htmlFor={`edit-${res}`} className="cursor-pointer font-black text-[9px] uppercase tracking-tight opacity-70">{res}</Label>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5 text-left">
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
                  </div>
                </ScrollArea>
                
                <DialogFooter className="p-8 pt-4 shrink-0 border-t border-muted/20">
                  <Button onClick={handleUpdateProfile} disabled={loading || !gender || !age || !weight || !height} className="w-full h-14 rounded-2xl font-black text-sm shadow-xl uppercase tracking-widest text-foreground border-none">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2 px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight text-foreground">{user.displayName || "Demo User"}</h2>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest border-none shrink-0">
                Pro Member
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-6 flex items-center gap-5 group hover:shadow-premium-lg transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:rotate-3 transition-transform shrink-0">
              <Scale className="w-6 h-6 text-foreground opacity-60" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-foreground opacity-40 uppercase tracking-widest">Weight</p>
              <p className="text-xl font-black tracking-tight uppercase text-foreground">{profile?.weight || "--"} <span className="text-[10px] font-black text-foreground opacity-20">kg</span></p>
            </div>
          </Card>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-6 flex items-center gap-5 group hover:shadow-premium-lg transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:rotate-3 transition-transform shrink-0">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-foreground opacity-40 uppercase tracking-widest">Status</p>
              <p className="text-xl font-black tracking-tight uppercase text-foreground">{profile?.bmiCategory || "Healthy"}</p>
            </div>
          </Card>
        </div>

        {/* Health Markers Display Section */}
        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-foreground opacity-40 uppercase tracking-[0.25em] px-2 text-center">Health Profile</h2>
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 space-y-6">
             <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Heart className="w-3 h-3 text-primary" /> Dietary Markers
                </p>
                <div className="flex flex-wrap gap-2">
                   {profile?.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? (
                     profile.dietaryRestrictions.map((res: string) => (
                       <Badge key={res} variant="secondary" className="bg-primary/10 text-foreground border-none px-4 py-1 rounded-lg font-black text-[9px] uppercase tracking-tight">
                         {res}
                       </Badge>
                     ))
                   ) : (
                     <p className="text-[11px] font-bold text-muted-foreground italic">No restrictions set</p>
                   )}
                </div>
             </div>
             <div className="space-y-3 pt-2 border-t border-muted/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Activity className="w-3 h-3 text-red-500" /> Allergies Detected
                </p>
                <p className="text-sm font-black text-foreground opacity-70">
                   {profile?.allergies || "None provided"}
                </p>
             </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-foreground opacity-40 uppercase tracking-[0.25em] px-2 text-center">Ecosystem Settings</h2>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-0">
              {[
                { icon: <Bell className="text-orange-600 w-4 h-4" />, label: "Smart Notifications", sub: "Meal reminders", hasSwitch: true },
                { icon: <ShieldCheck className="text-green-700 w-4 h-4" />, label: "Connected Platforms", sub: "Grab, Gojek integrated" },
                { icon: <Smartphone className="text-blue-600 w-4 h-4" />, label: "Wearable Sync", sub: "Sync Health Apps" },
              ].map((item, i, arr) => (
                <div key={i} className={cn("w-full flex items-center justify-between p-6 transition-all hover:bg-secondary/20", i !== arr.length - 1 && "border-b border-muted/30")}>
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary/50 p-3 rounded-xl shrink-0">{item.icon}</div>
                    <div className="text-left">
                      <p className="text-xs font-black tracking-tight uppercase text-foreground">{item.label}</p>
                      <p className="text-[8px] font-black text-foreground opacity-40 uppercase tracking-tighter mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  {item.hasSwitch ? <Switch checked={notifs} onCheckedChange={setNotifs} className="shrink-0" /> : <ChevronRight className="w-4 h-4 text-foreground opacity-20 shrink-0" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="pt-4">
          <Button onClick={handleLogout} className="w-full h-14 rounded-2xl font-black text-sm bg-red-600 hover:bg-red-700 text-white shadow-premium flex gap-3 transition-all border-none">
            <LogOut className="w-5 h-5 rotate-180" />
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  )
}
