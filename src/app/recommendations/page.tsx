"use client"

import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { curateMealSuggestions } from "@/ai/flows/curate-meal-suggestions"
import { Loader2, MapPin, Search, Store, ShoppingBag, Bike, Tag, CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RecommendationsPage() {
  const [prefs, setPrefs] = useState("")
  const [location, setLocation] = useState("Jakarta, Indonesia")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  // Mock deals for the AI flow
  const mockDeals = `ShopeeFood: SaladStop 20% off (Rp 45,000), GrabFood: HealthyBowl Buy 1 Get 1 (Rp 55,000), GoFood: VeganVibe Free Delivery (Rp 42,000)`

  const handleCurate = async () => {
    setLoading(true)
    try {
      const output = await curateMealSuggestions({
        dietaryPreferences: prefs,
        location,
        availableDeals: mockDeals
      })
      setResult(output.mealSuggestions)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pt-20 bg-background font-body">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-2 text-center">
          <h1 className="text-3xl font-headline font-bold text-foreground flex items-center justify-center gap-2">
            <Tag className="text-primary w-8 h-8" />
            Decision Fatigue Relief
          </h1>
          <p className="text-muted-foreground">We find the healthiest, cheapest meals from Shopee, Grab, and Gojek for you.</p>
        </section>

        <Card className="border-none shadow-xl overflow-hidden bg-accent/5">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-semibold">
                  <MapPin className="w-4 h-4" /> Current Location
                </Label>
                <Input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-xl border-accent/20 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-semibold">
                   Dietary Preferences
                </Label>
                <Input 
                  placeholder="Low sodium, keto, high protein..."
                  value={prefs}
                  onChange={(e) => setPrefs(e.target.value)}
                  className="rounded-xl border-accent/20 bg-white"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleCurate}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/80 h-14 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
              ) : (
                <Search className="w-5 h-5 mr-2" />
              )}
              Curate My Cheapest Healthy Meals
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
             <Card className="border-primary/20 bg-white shadow-xl">
               <CardHeader className="bg-primary/5 border-b border-primary/10">
                 <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="text-primary w-6 h-6" />
                      Top Curated Recommendations
                    </CardTitle>
                    <CheckCircle2 className="text-primary w-5 h-5" />
                 </div>
               </CardHeader>
               <CardContent className="p-8 prose prose-green max-w-none">
                  <div className="whitespace-pre-line leading-relaxed text-foreground/80 font-medium">
                    {result}
                  </div>
               </CardContent>
             </Card>

             <h3 className="text-xl font-headline font-bold pt-4">Price Comparison Summary</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-orange-100 hover:border-orange-500 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                       <ShoppingBag className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">ShopeeFood</p>
                      <p className="text-lg font-bold">Best Deals</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-100 hover:border-green-500 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                       <Bike className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">GrabFood</p>
                      <p className="text-lg font-bold">Fastest Delivery</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 hover:border-emerald-500 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                       <Store className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Gojek (GoFood)</p>
                      <p className="text-lg font-bold">Lowest Prices</p>
                    </div>
                  </CardContent>
                </Card>
             </div>
          </div>
        )}
      </main>
    </div>
  )
}