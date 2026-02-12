
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInAnonymously, updateProfile } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Chrome, Smartphone, CheckCircle2, ShieldCheck, Zap } from "lucide-react"
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
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 bg-background overflow-hidden">
      {/* Faded Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={bgImage} 
          alt="Healthy Food Background" 
          fill 
          className="object-cover opacity-10 grayscale-[10%]"
          priority
          data-ai-hint="healthy delicious food"
        />
      </div>

      <Card className="relative z-10 w-full max-w-md shadow-2xl border-none overflow-hidden rounded-[3rem] bg-white/95 backdrop-blur-sm animate-in fade-in zoom-in duration-700">
        {/* Header Section - Soft Green Header */}
        <div className="bg-primary pt-12 pb-10 text-center space-y-6">
          <div className="mx-auto bg-white/90 w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
            <ShieldCheck className="text-primary w-8 h-8" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 px-4">
            <h1 className="text-3xl font-headline font-black text-primary-foreground tracking-tight">NutriPal</h1>
            <p className="text-primary-foreground/90 font-bold text-xs">AI Powered Nutrition Ecosystem</p>
          </div>
        </div>

        <CardContent className="px-8 py-10 space-y-8">
          <div className="space-y-4">
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-14 text-sm rounded-2xl flex gap-3 font-black transition-all hover:scale-[1.01] active:scale-95 shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Chrome className="w-5 h-5" />}
              {loading ? syncStatus : "Sign in with Google (Demo Mode)"}
            </Button>
            
            <p className="text-center text-[10px] text-muted-foreground/70 leading-relaxed font-medium px-6">
              Demo mode simulates access to your delivery history and fitness metrics automatically.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40"><span className="bg-white px-3">Automated Ecosystem Sync</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Smartphone className="text-green-500 w-4 h-4" />, label: "GrabFood", color: "bg-green-50/50" },
              { icon: <Smartphone className="text-emerald-500 w-4 h-4" />, label: "GoFood", color: "bg-emerald-50/50" },
              { icon: <ShieldCheck className="text-red-500 w-4 h-4" />, label: "Fitness Apps", color: "bg-red-50/50" },
            ].map((app, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 ${app.color} rounded-2xl border border-transparent`}>
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  {app.icon}
                </div>
                <div className="space-y-0">
                  <p className="text-[10px] font-black">{app.label}</p>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-2 h-2 text-primary" />
                    <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-tighter">Connected</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
