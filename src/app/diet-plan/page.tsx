"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { personalizedDietPlans, type PersonalizedDietPlansOutput } from "@/ai/flows/personalized-diet-plans"
import { Loader2, Apple, CheckCircle2, Leaf, BrainCircuit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DietPlanPage() {
  const [dietaryNeeds, setDietaryNeeds] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PersonalizedDietPlansOutput | null>(null)
  const { toast } = useToast()

  // Debounce state to prevent rapid AI calls
  const [debouncedInput, setDebouncedInput] = useState({ dietaryNeeds: "", ingredients: "" })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput({ dietaryNeeds, ingredients })
    }, 1200) // 1.2s debounce
    return () => clearTimeout(timer)
  }, [dietaryNeeds, ingredients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const output = await personalizedDietPlans({
        dietaryNeeds: debouncedInput.dietaryNeeds || dietaryNeeds,
        availableIngredients: debouncedInput.ingredients || ingredients
      })
      setResult(output)
    } catch (error: any) {
      console.error("Failed to generate diet plan", error)
      toast({
        variant: "destructive",
        title: "Security & Rate Limit Protection",
        description: error.message?.includes("429") 
          ? "System is currently rotating keys. Please wait 2 seconds and retry." 
          : "An error occurred while communicating with the secure backend.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/20 p-3 rounded-full border border-primary/30">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase text-center">
            Diet Planner
          </h1>
          <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Secure AI Backend Active</p>
        </header>

        <Card className="border-none shadow-premium rounded-[2.5rem] bg-white">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="needs" className="text-[10px] font-black uppercase tracking-widest ml-1">Dietary Restrictions</Label>
                <Input 
                  id="needs"
                  placeholder="e.g. Vegetarian, Gluten-free..."
                  value={dietaryNeeds}
                  onChange={(e) => setDietaryNeeds(e.target.value)}
                  className="rounded-2xl h-14 border-2 border-border focus:border-primary font-bold"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ingredients" className="text-[10px] font-black uppercase tracking-widest ml-1">Available Pantry Items</Label>
                <Textarea 
                  id="ingredients"
                  placeholder="e.g. Avocado, Spinach, Quinoa..."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  className="min-h-[120px] rounded-2xl border-2 border-border focus:border-primary font-bold"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-foreground hover:opacity-90 h-16 text-lg rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Calculating Path...
                  </>
                ) : (
                  "Synthesize My Plan"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg text-primary w-fit mx-auto border border-primary/20">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-black uppercase tracking-widest text-[10px]">Ecosystem Match Found</span>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-center uppercase tracking-tighter">Recommended Strategy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.mealRecommendations.map((meal, idx) => (
                  <Card key={idx} className="bg-white border-2 border-border hover:border-primary transition-all rounded-3xl">
                    <CardContent className="p-6">
                      <p className="font-black text-lg uppercase tracking-tight text-primary leading-tight">{meal}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-center uppercase tracking-tighter">Culinary Execution</h2>
              <Accordion type="single" collapsible className="w-full bg-white rounded-[2rem] shadow-premium overflow-hidden border-2 border-border">
                {result.recipes.map((recipe, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border-b-2 border-border last:border-0 px-8">
                    <AccordionTrigger className="text-left font-black uppercase text-sm hover:no-underline py-6">
                      Recipe Path {idx + 1}
                    </AccordionTrigger>
                    <AccordionContent className="whitespace-pre-line text-foreground/80 pb-8 leading-relaxed font-bold text-xs">
                      {recipe}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-chart-3 flex items-center justify-center gap-3 uppercase tracking-tighter">
                <Leaf className="w-7 h-7" />
                Premium Substitutes
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {result.healthierAlternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-5 bg-chart-3/5 rounded-[1.5rem] border-2 border-chart-3/10">
                    <div className="w-3 h-3 rounded-full bg-chart-3 mt-1.5 shrink-0" />
                    <p className="text-sm font-black uppercase tracking-tight opacity-70 leading-relaxed">{alt}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
