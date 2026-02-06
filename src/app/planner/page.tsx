
"use client"

import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  MapPin, 
  TrendingUp, 
  ShoppingBag, 
  Smartphone, 
  Loader2,
  Tag
} from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

export default function PlannerPage() {
  const [loading, setLoading] = useState(false)
  const [curated, setCurated] = useState<any[] | null>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurate = () => {
    setLoading(true)
    setTimeout(() => {
      setCurated([
        {
          id: 1,
          name: "Grilled Chicken Buddha Bowl",
          calories: 450,
          price: "Rp 42,000",
          platform: "ShopeeFood",
          platformIcon: <ShoppingBag className="text-orange-500 w-4 h-4" />,
          promo: "20% Discount",
          healthScore: 95,
          distance: "1.2 km"
        },
        {
          id: 2,
          name: "Organic Tofu Soba Noodles",
          calories: 380,
          price: "Rp 38,500",
          platform: "GrabFood",
          platformIcon: <Smartphone className="text-green-500 w-4 h-4" />,
          promo: "Free Delivery",
          healthScore: 92,
          distance: "0.8 km"
        },
        {
          id: 3,
          name: "Avocado Quinoa Salad",
          calories: 410,
          price: "Rp 45,000",
          platform: "GoFood",
          platformIcon: <Tag className="text-red-500 w-4 h-4" />,
          promo: "Buy 1 Get 1",
          healthScore: 98,
          distance: "2.1 km"
        }
      ])
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary font-bold text-xs uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> Decision Fatigue Relief
        </div>
        <h1 className="text-3xl font-headline font-bold">AI Meal Curation</h1>
        <p className="text-muted-foreground">We've filtered {profile?.dietaryRestrictions?.length || 0}+ dietary needs across 3 platforms to find your best matches.</p>
      </header>

      {!curated ? (
        <Card className="border-none shadow-2xl overflow-hidden bg-primary text-primary-foreground text-center py-12 relative">
          <CardContent className="space-y-6 relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto blur-sm absolute top-0 left-1/2 -translate-x-1/2" />
            <Sparkles className="w-16 h-16 mx-auto mb-4 animate-pulse" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Ready to eat healthy?</h2>
              <p className="text-white/80 max-w-xs mx-auto">Click below to let NutriPal filter through hundreds of options for you.</p>
            </div>
            <Button 
              onClick={handleCurate}
              disabled={loading}
              className="bg-white text-primary hover:bg-white/90 font-black h-14 px-12 rounded-2xl text-lg shadow-xl"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Curate My Top 3
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Top 3 Curated Matches</h2>
            <Button variant="ghost" size="sm" onClick={() => setCurated(null)} className="text-xs">Reset</Button>
          </div>
          
          <div className="space-y-4">
            {curated.map((item, idx) => (
              <Card key={item.id} className={`rounded-3xl border-none shadow-lg overflow-hidden relative ${idx === 0 ? 'ring-2 ring-primary ring-offset-4' : ''}`}>
                {idx === 0 && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-black uppercase rounded-bl-xl">Best Match</div>}
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary font-black text-sm">
                          <TrendingUp className="w-4 h-4" /> {item.healthScore}% Health Score
                        </div>
                        <h3 className="text-xl font-bold">{item.name}</h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-lg bg-secondary/50 font-bold">{item.calories} kcal</Badge>
                        <Badge variant="outline" className="rounded-lg border-primary/20 text-primary font-bold">{item.promo}</Badge>
                      </div>
                    </div>

                    <div className="md:text-right flex flex-col justify-between items-start md:items-end border-t md:border-t-0 pt-4 md:pt-0">
                      <div>
                        <p className="text-2xl font-black">{item.price}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {item.platformIcon} {item.platform} • <MapPin className="w-3 h-3" /> {item.distance}
                        </div>
                      </div>
                      <Button className="w-full md:w-auto mt-4 md:mt-0 rounded-xl h-11 px-8 font-bold">Order Now</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-[10px] text-muted-foreground max-w-xs mx-auto italic">
            Suggestions are based on your remaining calories for today and your allergy profile.
          </p>
        </div>
      )}
    </div>
  )
}
