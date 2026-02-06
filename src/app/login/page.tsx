
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Loader2, Chrome, Smartphone, ShoppingBag } from "lucide-react"

export default function LoginPage() {
  const { auth } = useAuth()
  const { user, isUserLoading } = useUser()
  const { firestore } = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && !isUserLoading) {
      checkOnboarding()
    }
  }, [user, isUserLoading])

  const checkOnboarding = async () => {
    if (!user) return
    const userDoc = await getDoc(doc(firestore, "users", user.uid))
    if (userDoc.exists() && userDoc.data().onboarded) {
      router.push("/")
    } else {
      router.push("/onboarding")
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Login failed", error)
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-primary/5">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShoppingBag className="text-primary-foreground w-8 h-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-headline font-extrabold">Welcome to NutriPal</CardTitle>
            <CardDescription className="text-muted-foreground">Your AI-powered personal nutrition ecosystem.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={handleLogin} disabled={loading} className="w-full h-12 text-lg rounded-xl flex gap-2 font-bold transition-all hover:scale-[1.02]">
            {loading ? <Loader2 className="animate-spin" /> : <Chrome className="w-5 h-5" />}
            Sign in with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Ecosystem Integrations</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 opacity-60">
            <div className="flex items-center gap-2 text-xs font-medium p-2 bg-secondary/50 rounded-lg border">
              <ShoppingBag className="w-4 h-4 text-orange-500" /> ShopeeFood
            </div>
            <div className="flex items-center gap-2 text-xs font-medium p-2 bg-secondary/50 rounded-lg border">
              <Smartphone className="w-4 h-4 text-green-500" /> GrabFood
            </div>
            <div className="flex items-center gap-2 text-xs font-medium p-2 bg-secondary/50 rounded-lg border">
              <Chrome className="w-4 h-4 text-blue-500" /> GoFood
            </div>
            <div className="flex items-center gap-2 text-xs font-medium p-2 bg-secondary/50 rounded-lg border">
              <Smartphone className="w-4 h-4 text-red-500" /> Fitness Sync
            </div>
          </div>
          
          <p className="text-center text-[10px] text-muted-foreground italic">
            NutriPal automatically syncs with your favorite delivery and fitness apps after login.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
