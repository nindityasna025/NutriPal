
"use client"

import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { doc } from "firebase/firestore"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Smartphone, 
  Scale, 
  Activity,
  ChevronRight
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const { user } = useUser()
  const { auth } = useAuth()
  const { firestore } = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  if (!user) return null

  return (
    <div className="min-h-screen pb-20 md:pt-20 bg-background font-body">
      <Navbar />
      
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <section className="flex flex-col items-center text-center space-y-4 pt-4">
          <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-xl">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold uppercase">
              {user.displayName?.charAt(0) || user.email?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-headline font-black">{user.displayName || "NutriPal User"}</h1>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Pro Member</Badge>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">Verified AI</Badge>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Weight</p>
                <p className="font-black">{profile?.weight || "--"} kg</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">BMI Category</p>
                <p className="font-black text-xs">{profile?.bmiCategory || "Calculating"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Account Ecosystem</h2>
          
          <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors border-b">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Connected Platforms</p>
                    <p className="text-[10px] text-muted-foreground">Shopee, Grab, Gojek linked</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors border-b">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Wearable Settings</p>
                    <p className="text-[10px] text-muted-foreground">Sync health metrics</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Privacy & Security</p>
                    <p className="text-[10px] text-muted-foreground">Manage your data</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        <Button 
          onClick={handleLogout}
          variant="destructive" 
          className="w-full h-14 rounded-2xl font-black text-lg shadow-lg flex gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log Out of NutriPal
        </Button>

        <p className="text-center text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">
          App Version 1.0.0 (Beta) • Powered by NutriAI
        </p>
      </main>
    </div>
  )
}
