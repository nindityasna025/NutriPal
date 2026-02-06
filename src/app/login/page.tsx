
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInAnonymously, updateProfile } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Chrome, Smartphone, ShoppingBag, CheckCircle2, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  useEffect(() => {
    if (user && !isUserLoading && !loading) {
      checkOnboarding()
    }
  }, [user, isUserLoading])

  const checkOnboarding = async () => {
    if (!user) return
    const userDocRef = doc(firestore, "users", user.uid)
    const userDoc = await getDoc(userDocRef)
    
    if (userDoc.exists() && userDoc.data().onboarded) {
      router.push("/")
    } else if (userDoc.exists() && !userDoc.data().onboarded) {
      router.push("/onboarding")
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setSyncStatus("Connecting to Google (Simulated)...")
    try {
      // Dummy Login using Anonymous Auth to keep Firebase session active
      const result = await signInAnonymously(auth)
      const loggedInUser = result.user

      // Set a dummy display name for the demo
      await updateProfile(loggedInUser, {
        displayName: "Demo User"
      })

      setSyncStatus("Syncing Shopee, Grab & GoFood...")
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setSyncStatus("Authenticating Fitness Wearables...")
      await new Promise(resolve => setTimeout(resolve, 800))

      const userDocRef = doc(firestore, "users", loggedInUser.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          id: loggedInUser.uid,
          email: "demo@nutripal.ai",
          onboarded: false,
          createdAt: serverTimestamp(),
          connectedApps: {
            shopee: true,
            grab: true,
            gofood: true,
            fitness: true
          }
        })
        router.push("/onboarding")
      } else {
        if (userDoc.data().onboarded) {
          router.push("/")
        } else {
          router.push("/onboarding")
        }
      }
    } catch (error) {
      console.error("Dummy login failed", error)
      setSyncStatus("Error in simulation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium animate-pulse">Initializing NutriPal...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background/50">
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
        {/* Header Section */}
        <div className="bg-primary pt-12 pb-10 text-center space-y-6">
          <div className="mx-auto bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary/20">
            <ShieldCheck className="text-primary w-10 h-10" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-black text-primary-foreground tracking-tight">NutriPal</h1>
            <p className="text-primary-foreground/70 font-bold text-sm">AI Powered Nutrition Ecosystem</p>
          </div>
        </div>

        <CardContent className="px-8 py-10 space-y-8">
          <div className="space-y-4">
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-14 text-md rounded-2xl flex gap-3 font-black transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Chrome className="w-5 h-5" />}
              {loading ? syncStatus : "Sign in with Google (Demo Mode)"}
            </Button>
            
            <p className="text-center text-[11px] text-muted-foreground leading-relaxed font-medium px-4">
              Ini adalah mode demo. NutriPal akan mensimulasikan akses ke riwayat pengiriman dan metrik kebugaran Anda secara otomatis.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60"><span className="bg-white px-4">Automated Ecosystem Sync</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <ShoppingBag className="text-orange-500" />, label: "ShopeeFood", color: "bg-orange-50/50" },
              { icon: <Smartphone className="text-green-500" />, label: "GrabFood", color: "bg-green-50/50" },
              { icon: <ShieldCheck className="text-red-500" />, label: "Fitness App", color: "bg-red-50/50" },
              { icon: <Smartphone className="text-emerald-500" />, label: "GoFood", color: "bg-emerald-50/50" },
            ].map((app, i) => (
              <div key={i} className={`flex items-center gap-3 p-3.5 ${app.color} rounded-[1.5rem] border border-transparent transition-all group hover:bg-white hover:border-border hover:shadow-sm`}>
                <div className="bg-white p-2.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  {app.icon}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-black">{app.label}</p>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">Auto-Sync</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-primary/5 rounded-[1.5rem] flex items-start gap-3 border border-primary/10">
            <div className="bg-white p-2 rounded-xl mt-0.5 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal font-medium italic">
              <strong className="text-foreground not-italic">Simulasi Selesai:</strong> Tidak ada data nyata yang diambil. Integrasi ini sepenuhnya dummy untuk keperluan analisis alur pengguna.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
