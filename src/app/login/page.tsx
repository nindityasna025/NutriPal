
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInAnonymously, updateProfile } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Chrome, Smartphone, ShoppingBag, CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function LoginPage() {
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const bgImage = PlaceHolderImages.find(img => img.id === 'login-bg')?.imageUrl || "https://picsum.photos/seed/nutri-bg/1920/1080"

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
    setSyncStatus("Connecting...")
    try {
      const result = await signInAnonymously(auth)
      const loggedInUser = result.user

      await updateProfile(loggedInUser, {
        displayName: "Demo User"
      })

      setSyncStatus("Syncing ecosystem...")
      await new Promise(resolve => setTimeout(resolve, 1500))
      
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
      console.error("Login failed", error)
      setSyncStatus("Error. Try again.")
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
    <div className="relative flex min-h-screen w-full items-center justify-center p-6 bg-background overflow-hidden">
      {/* Faded Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={bgImage} 
          alt="Healthy Food Background" 
          fill 
          className="object-cover opacity-5 grayscale-[20%]"
          priority
          data-ai-hint="healthy delicious food"
        />
      </div>

      <Card className="relative z-10 w-full max-w-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-none overflow-hidden rounded-[3rem] bg-white/95 backdrop-blur-md animate-in fade-in zoom-in duration-700">
        {/* Header Section with centered elements */}
        <div className="bg-primary/40 pt-16 pb-12 text-center space-y-6">
          <div className="mx-auto bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-sm">
            <ShieldCheck className="text-primary w-10 h-10" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-black text-primary-foreground tracking-tighter">NutriPal</h1>
            <p className="text-primary-foreground/80 font-bold text-sm">AI Powered Nutrition Ecosystem</p>
          </div>
        </div>

        <CardContent className="px-10 py-12 space-y-10">
          <div className="space-y-6">
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-16 text-md rounded-2xl flex gap-3 font-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Chrome className="w-5 h-5" />}
              {loading ? syncStatus : "Sign in with Google (Demo Mode)"}
            </Button>
            
            <p className="text-center text-[11px] text-muted-foreground/80 leading-relaxed font-medium px-4">
              Ini adalah mode demo. NutriPal akan mensimulasikan akses ke riwayat pengiriman dan metrik kebugaran Anda secara otomatis.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"><span className="bg-white px-4">Automated Ecosystem Sync</span></div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: <ShoppingBag className="text-orange-500 w-5 h-5" />, label: "ShopeeFood", color: "bg-orange-50/40" },
              { icon: <Smartphone className="text-green-500 w-5 h-5" />, label: "GrabFood", color: "bg-green-50/40" },
              { icon: <ShieldCheck className="text-red-500 w-5 h-5" />, label: "Fitness Apps", color: "bg-red-50/40" },
              { icon: <Smartphone className="text-emerald-500 w-5 h-5" />, label: "GoFood", color: "bg-emerald-50/40" },
            ].map((app, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 ${app.color} rounded-[2rem] border border-transparent transition-all group hover:bg-white hover:border-border hover:shadow-sm`}>
                <div className="bg-white p-2.5 rounded-2xl shadow-sm group-hover:scale-105 transition-transform">
                  {app.icon}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-black">{app.label}</p>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Auto-Sync</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-5 bg-primary/5 rounded-[2rem] flex items-start gap-4 border border-primary/10">
            <div className="bg-white p-2.5 rounded-xl mt-0.5 shadow-sm">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground/80 leading-normal font-medium italic">
              <strong className="text-foreground not-italic">Info Ekosistem:</strong> Platform akan secara otomatis mensinkronkan data riwayat pesanan untuk perhitungan kalori yang akurat.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
