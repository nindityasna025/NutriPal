
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
import { 
  LogOut, 
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
  const [notifs, setNotifs] = useState(false)

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight?.toString() || "")
      setHeight(profile.height?.toString() || "")
      setAge(profile.age?.toString() || "")
      setGender(profile.gender || "")
      setNotifs(!!profile.notificationsEnabled)
    }
  }, [profile])

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const handleUpdateProfile = async () => {
    if (!user || !profileRef) return
    setLoading(true)
    try {
      updateDocumentNonBlocking(profileRef, {
        gender,
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        notificationsEnabled: notifs,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Profile Updated", description: "Body metrics have been synced." })
      setIsEditDialogOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-32 min-h-screen relative">
      <header className="space-y-1 pt-safe md:pt-4 animate-in fade-in duration-700 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Profile</h1>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60">Manage Your Health Metrics</p>
      </header>

      <section className="space-y-10">
        <div className="flex flex-col items-center text-center space-y-6 pt-2">
          <div className="relative">
            <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white shadow-premium">
              <AvatarImage src={user.photoURL || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-black uppercase">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="absolute bottom-0 right-0 rounded-full h-9 w-9 p-0 border-white bg-primary text-white shadow-premium">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-[2.5rem] p-0 border-none bg-background w-[92vw] md:left-[calc(50%+8rem)] max-h-[90vh] flex flex-col">
                <DialogHeader className="p-8 pb-4 shrink-0">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Update Metrics</DialogTitle>
                </DialogHeader>
                <div className="p-8 pt-0 space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Weight (kg)</Label>
                      <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-11 rounded-xl border-primary/10 font-bold" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Height (cm)</Label>
                      <Input type="number" value={height} onChange={e => setHeight(e.target.value)} className="h-11 rounded-xl border-primary/10 font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(e.target.value)} className="h-11 rounded-xl border-primary/10 font-bold" />
                  </div>
                </div>
                <DialogFooter className="p-8 pt-0 shrink-0">
                  <Button onClick={handleUpdateProfile} disabled={loading} className="w-full h-14 rounded-2xl font-black text-sm shadow-xl uppercase tracking-widest">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Sync Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2 px-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight">{user.displayName || "Demo User"}</h2>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest border-none shrink-0">
                Pro Member
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-6 flex items-center gap-5 group hover:shadow-premium-lg transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:rotate-3 transition-transform shrink-0">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Weight</p>
              <p className="text-xl font-black tracking-tight uppercase">{profile?.weight || "--"} <span className="text-[10px] font-bold text-muted-foreground">kg</span></p>
            </div>
          </Card>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] p-6 flex items-center gap-5 group hover:shadow-premium-lg transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:rotate-3 transition-transform shrink-0">
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
              <p className="text-xl font-black tracking-tight uppercase">{profile?.bmiCategory || "Healthy"}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] px-2 text-center lg:text-left">Ecosystem Settings</h2>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-0">
              {[
                { icon: <Bell className="text-orange-500 w-4 h-4" />, label: "Smart Notifications", sub: "Meal reminders", hasSwitch: true },
                { icon: <ShieldCheck className="text-green-500 w-4 h-4" />, label: "Connected Platforms", sub: "Grab, Gojek integrated" },
                { icon: <Smartphone className="text-blue-500 w-4 h-4" />, label: "Wearable Sync", sub: "Sync Health Apps" },
              ].map((item, i, arr) => (
                <div key={i} className={cn("w-full flex items-center justify-between p-6 transition-all hover:bg-secondary/20", i !== arr.length - 1 && "border-b border-muted/30")}>
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary/50 p-3 rounded-xl shrink-0">{item.icon}</div>
                    <div className="text-left">
                      <p className="text-xs font-black tracking-tight uppercase">{item.label}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  {item.hasSwitch ? <Switch checked={notifs} onCheckedChange={setNotifs} className="shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="pt-4">
          <Button onClick={handleLogout} className="w-full h-14 rounded-2xl font-black text-sm bg-red-500 hover:bg-red-600 text-white shadow-premium flex gap-3 transition-all">
            <LogOut className="w-5 h-5 rotate-180" />
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  )
}
