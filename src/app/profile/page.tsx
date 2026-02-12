
"use client"

import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Smartphone, 
  Scale, 
  Activity,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  if (!user) return null

  return (
    <div className="min-h-screen pb-24 bg-background font-body">
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-700">
        <section className="flex flex-col items-center text-center space-y-6 pt-10">
          <Avatar className="w-32 h-32 border-[6px] border-white shadow-2xl">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-black uppercase">
              {user.displayName?.charAt(0) || user.email?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight uppercase">{user.displayName || "Demo User"}</h1>
            <div className="flex justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                Pro Member
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                Verified AI
              </Badge>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-6 flex items-center gap-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Weight</p>
              <p className="text-2xl font-black">{profile?.weight || "70"} <span className="text-sm font-bold text-muted-foreground">kg</span></p>
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
                { icon: <ShieldCheck className="text-green-500 w-5 h-5" />, label: "Connected Platforms", sub: "Grab, Gojek integrated" },
                { icon: <Smartphone className="text-blue-500 w-5 h-5" />, label: "Wearable Sync", sub: "Sync Apple Health / Google Fit" },
                { icon: <Settings className="text-muted-foreground w-5 h-5" />, label: "Privacy & Data", sub: "Manage your AI permissions" },
              ].map((item, i, arr) => (
                <button 
                  key={i} 
                  className={cn(
                    "w-full flex items-center justify-between p-7 hover:bg-secondary/30 transition-all active:scale-[0.99]",
                    i !== arr.length - 1 && "border-b border-muted/30"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className="bg-secondary/50 p-3 rounded-2xl">{item.icon}</div>
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight uppercase">{item.label}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="pt-6 space-y-8">
          <Button 
            onClick={handleLogout}
            className="w-full h-16 rounded-[2rem] font-black text-lg bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20 flex gap-3 transition-all active:scale-95"
          >
            <LogOut className="w-6 h-6 rotate-180" />
            Sign Out of NutriPal
          </Button>
          
          <p className="text-center text-[9px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-40 pb-10">
            Version 1.2.0 • Powered by Google Gemini
          </p>
        </div>
      </main>
    </div>
  )
}
