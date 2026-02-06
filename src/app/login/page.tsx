
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Chrome, Smartphone, ShoppingBag, CheckCircle2, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const { auth } = useAuth()
  const { user, isUserLoading } = useUser()
  const { firestore } = useFirestore()
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
    setSyncStatus("Connecting to Google...")
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const loggedInUser = result.user

      // Simulate the "Automated Integration" flow
      setSyncStatus("Syncing Shopee, Grab & GoFood...")
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setSyncStatus("Authenticating Fitness Wearables...")
      await new Promise(resolve => setTimeout(resolve, 800))

      const userDocRef = doc(firestore, "users", loggedInUser.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Initialize user with simulated connected apps
        await setDoc(userDocRef, {
          id: loggedInUser.uid,
          email: loggedInUser.email,
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
      setSyncStatus(null)
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-primary/5">
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-[2.5rem]">
        <div className="bg-primary p-8 text-center space-y-4">
          <div className="mx-auto bg-white w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl">
            <ShieldCheck className="text-primary w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-black text-primary-foreground">NutriPal</h1>
            <p className="text-primary-foreground/80 font-medium">AI-Powered Nutrition Ecosystem</p>
          </div>
        </div>

        <CardContent className="p-8 space-y-8 bg-white">
          <div className="space-y-4">
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-14 text-lg rounded-2xl flex gap-3 font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary/10"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Chrome className="w-6 h-6" />}
              {loading ? syncStatus : "Sign in with Google"}
            </Button>
            
            <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
              By signing in, you authorize NutriPal to securely access your delivery history and fitness metrics for personalized planning.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground"><span className="bg-white px-4">Automated Ecosystem Sync</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <ShoppingBag className="text-orange-500" />, label: "ShopeeFood", color: "bg-orange-50" },
              { icon: <Smartphone className="text-green-500" />, label: "GrabFood", color: "bg-green-50" },
              { icon: <ShieldCheck className="text-red-500" />, label: "Fitness App", color: "bg-red-50" },
              { icon: <Smartphone className="text-emerald-500" />, label: "GoFood", color: "bg-emerald-50" },
            ].map((app, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 ${app.color} rounded-2xl border border-transparent hover:border-border transition-colors group`}>
                <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  {app.icon}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold">{app.label}</p>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground font-medium uppercase">Auto-Sync</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-muted/30 rounded-2xl flex items-start gap-3">
            <div className="bg-primary/20 p-1.5 rounded-lg mt-0.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-normal">
              <strong>Simulated Integration:</strong> No real passwords or data from these apps will be requested during this demo. Integration is mocked for user flow analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
