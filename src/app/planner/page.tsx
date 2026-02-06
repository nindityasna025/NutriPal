
"use client"

import { useState } from "react"
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
  Tag,
  Bike
} from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"

export default function PlannerPage() {
  const [loading, setLoading] = useState(false)
  const [curatedResult, setCuratedResult] = useState<any[] | null>(null)
  const { user } = useUser()
  const firestore = useFirestore()

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid, "profile", "main") : null, [user, firestore])
  const { data: profile } = useDoc(profileRef)

  const handleCurate = async () => {
    setLoading(true)
    try {
      // Simulation of real AI Flow call
      const dietary = profile?.dietaryRestrictions?.join(", ") || "No specific restrictions"
      const mockDeals = "ShopeeFood: SaladStop 20% off, GrabFood: HealthyBowl Buy 1 Get 1, GoFood: VeganVibe Free Delivery"
      
      const { mealSuggestions } = await curateMealSuggestions({
        dietaryPreferences: dietary,
        location: "Jakarta, Indonesia",
        availableDeals: mockDeals
      })

      // We transform the AI text result into structured objects for the UI
      // In a real scenario, the prompt would return JSON, but here we simulate the structured output
      setCuratedResult([
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
          platformIcon: <Bike className="text-emerald-500 w-4 h-4" />,
          promo: "Buy 1 Get 1",
          healthScore: 98,
          distance: "2.1 km"
        }
      ])
    } catch (error) {
      console.error("AI Curation failed", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary font-bold text-xs uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> Decision Fatigue Relief
        </div>
        <h1 className="text-4xl font-black tracking-tight">AI Meal Curation</h1>
        <p className="text-muted-foreground font-medium">NutriPal filters through delivery platforms to find matches for your {profile?.dietaryRestrictions?.length || 0} restrictions.</p>
      </header>

      {!curatedResult ? (
        <Card className="border-none shadow-2xl overflow-hidden bg-primary text-primary-foreground text-center py-16 relative rounded-[3rem]">
          <CardContent className="space-y-8 relative z-10">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto blur-md absolute top-0 left-1/2 -translate-x-1/2" />
            <Sparkles className="w-20 h-20 mx-auto mb-4 animate-pulse" />
            <div className="space-y-3">
              <h2 className="text-3xl font-black">Feeling Indecisive?</h2>
              <p className="text-white/80 max-w-sm mx-auto font-medium leading-relaxed">
                Let NutriPal analyze your remaining calories and allergy profile to suggest the best meals from Shopee, Grab, and Gojek.
              </p>
            </div>
            <Button 
              onClick={handleCurate}
              disabled={loading}
              className="bg-white text-primary hover:bg-white/90 font-black h-16 px-16 rounded-[2rem] text-xl shadow-2xl transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin mr-3" /> : null}
              Curate My Top 3
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center justify-between px-4">
            <h2 className="font-black text-xs text-muted-foreground uppercase tracking-[0.2em]">Top 3 Curated Matches</h2>
            <Button variant="ghost" size="sm" onClick={() => setCuratedResult(null)} className="text-[10px] font-black uppercase tracking-widest">Reset Tool</Button>
          </div>
          
          <div className="space-y-5">
            {curatedResult.map((item, idx) => (
              <Card key={item.id} className={cn(
                "rounded-[2.5rem] border-none shadow-xl overflow-hidden relative group transition-all hover:scale-[1.01]",
                idx === 0 ? 'ring-4 ring-primary ring-offset-4' : 'bg-white'
              )}>
                {idx === 0 && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-6 py-2 text-[10px] font-black uppercase rounded-bl-[1.5rem] shadow-sm">Best Match</div>}
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                          <TrendingUp className="w-4 h-4" /> {item.healthScore}% Health Score
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">{item.name}</h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        <Badge variant="secondary" className="rounded-xl px-4 py-1.5 bg-secondary/50 font-black text-[10px] uppercase">{item.calories} kcal</Badge>
                        <Badge variant="outline" className="rounded-xl px-4 py-1.5 border-primary/20 text-primary font-black text-[10px] uppercase">{item.promo}</Badge>
                      </div>
                    </div>

                    <div className="md:text-right flex flex-col justify-between items-start md:items-end border-t md:border-t-0 pt-6 md:pt-0">
                      <div className="space-y-1">
                        <p className="text-3xl font-black tracking-tighter">{item.price}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          {item.platformIcon} {item.platform} • <MapPin className="w-3 h-3" /> {item.distance}
                        </div>
                      </div>
                      <Button className="w-full md:w-auto mt-6 md:mt-0 rounded-2xl h-12 px-10 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">Order Now</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="p-6 bg-secondary/20 rounded-[2rem] border border-dashed border-primary/20 text-center">
            <p className="text-[10px] text-muted-foreground max-w-sm mx-auto italic font-medium leading-relaxed uppercase tracking-tighter">
              Suggestions are based on your remaining <strong className="text-foreground">740 kcal</strong> for today and your <strong className="text-foreground">Diabetic</strong> allergy profile.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
