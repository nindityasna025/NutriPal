
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
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Smartphone, 
  Scale, 
  Activity,
  ChevronRight,
  Edit2,
  Loader2,
  Bell
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

  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "">("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState("")
  const [bmi, setBmi] = useState<number | null>(null)
  const [category, setCategory] = useState("")
  const [notifs, setNotifs] = useState(false)

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight?.toString() || "")
      setHeight(profile.height?.toString() || "")
      setAge(profile.age?.toString() || "")
      setGender(profile.gender || "")
      setRestrictions(profile.dietaryRestrictions || [])
      setAllergies(profile.allergies || "")
      setNotifs(!!profile.notificationsEnabled)
    }
  }, [profile])

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

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const handleUpdateProfile = async () => {
    if (!user || !profileRef) return
    setLoading(true)
    try {
      const updatedData = {
        gender,
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        bmi,
        bmiCategory: category,
        dietaryRestrictions: restrictions,
        allergies,
        notificationsEnabled: notifs,
        calorieTarget: category === "Ideal" ? 2000 : category === "Obese" ? 1800 : 2500,
        updatedAt: serverTimestamp()
      }
      
      updateDocumentNonBlocking(profileRef, updatedData)
      toast({ title: "Profile Updated", description: "Your body metrics have been synced." })
      setIsEditDialogOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleNotifs = async (enabled: boolean) => {
    setNotifs(enabled)
    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        toast({ title: "Notifications Active", description: "Smart meal reminders enabled." })
      }
    }
    if (profileRef) {
      updateDocumentNonBlocking(profileRef, { notificationsEnabled: enabled })
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen pb-24 bg-background font-body">
      <main className="max-w-5xl mx-auto px-8 py-8 space-y-10 animate-in fade-in duration-700">
        <header className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Profile</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Manage Your Health Metrics</p>
        </header>

        <section className="flex flex-col items-center text-center space-y-6 pt-4 relative">
          <Avatar className="w-32 h-32 border-[6px] border-white shadow-2xl">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-black uppercase">
              {user.displayName?.charAt(0) || user.email?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight uppercase">{user.displayName || "Demo User"}</h2>
            <div className="flex justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                Pro Member
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                Verified AI
              </Badge>
            </div>
          </div>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="absolute top-0 right-0 rounded-full h-12 w-12 p-0 border-primary/20 bg-white shadow-sm hover:bg-primary/5">
                <Edit2 className="w-5 h-5 text-primary" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-0 border-none bg-background">
              <DialogHeader className="p-8 pb-4">
                <DialogTitle className="text-3xl font-black uppercase tracking-tight text-center">Update Metrics</DialogTitle>
              </DialogHeader>
              <div className="p-8 pt-0 space-y-8">
                {/* Profile Edit Fields */}
              </div>
              <DialogFooter className="p-8 pt-0">
                <Button onClick={handleUpdateProfile} disabled={loading} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl uppercase tracking-widest">
                  {loading ? <Loader2 className="animate-spin" /> : "Sync Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-6 flex items-center gap-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Weight</p>
              <p className="text-2xl font-black">{profile?.weight || "--"} <span className="text-sm font-bold text-muted-foreground">kg</span></p>
            </div>
          </Card>
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-6 flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-blue-500" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
              <p className="text-2xl font-black">{profile?.bmiCategory || "Healthy"}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-4">Ecosystem Settings</h2>
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden">
            <CardContent className="p-0">
              {[
                { icon: <Bell className="text-orange-500 w-5 h-5" />, label: "Smart Notifications", sub: "Meal reminders", hasSwitch: true },
                { icon: <ShieldCheck className="text-green-500 w-5 h-5" />, label: "Connected Platforms", sub: "Grab, Gojek integrated" },
                { icon: <Smartphone className="text-blue-500 w-5 h-5" />, label: "Wearable Sync", sub: "Sync Health Apps" },
              ].map((item, i, arr) => (
                <div key={i} className={cn("w-full flex items-center justify-between p-7 transition-all", i !== arr.length - 1 && "border-b border-muted/30")}>
                  <div className="flex items-center gap-6">
                    <div className="bg-secondary/50 p-3 rounded-2xl">{item.icon}</div>
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight uppercase">{item.label}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  {item.hasSwitch ? <Switch checked={notifs} onCheckedChange={handleToggleNotifs} /> : <ChevronRight className="w-5 h-5 text-muted-foreground/30" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="pt-6">
          <Button onClick={handleLogout} className="w-full h-16 rounded-[2rem] font-black text-lg bg-red-500 hover:bg-red-600 text-white shadow-xl flex gap-3">
            <LogOut className="w-6 h-6 rotate-180" />
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  )
}
