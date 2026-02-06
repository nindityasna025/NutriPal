"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { personalizedDietPlans, type PersonalizedDietPlansOutput } from "@/ai/flows/personalized-diet-plans"
import { Loader2, Apple, CheckCircle2, Leaf } from "lucide-react"

export default function DietPlanPage() {
  const [dietaryNeeds, setDietaryNeeds] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PersonalizedDietPlansOutput | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const output = await personalizedDietPlans({
        dietaryNeeds,
        availableIngredients: ingredients
      })
      setResult(output)
    } catch (error) {
      console.error("Failed to generate diet plan", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-2 text-center">
          <h1 className="text-3xl font-headline font-bold text-foreground flex items-center justify-center gap-2">
            <Apple className="text-primary w-8 h-8" />
            Personalized Diet Planner
          </h1>
          <p className="text-muted-foreground">Tailor your nutrition to your specific needs and what&apos;s in your pantry.</p>
        </section>

        <Card className="border-none shadow-xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="needs">Dietary Restrictions / Preferences</Label>
                <Input 
                  id="needs"
                  placeholder="e.g. Vegetarian, Gluten-free, Vegan, Keto..."
                  value={dietaryNeeds}
                  onChange={(e) => setDietaryNeeds(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ingredients">Available Ingredients (separated by comma)</Label>
                <Textarea 
                  id="ingredients"
                  placeholder="e.g. Avocado, Spinach, Quinoa, Chicken breast, Lemon..."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  className="min-h-[100px] rounded-xl"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg rounded-xl transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Nutrients...
                  </>
                ) : (
                  "Generate My Custom Plan"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg text-primary w-fit">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold uppercase tracking-wider text-xs">AI-Generated Plan Ready</span>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-bold">Meal Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.mealRecommendations.map((meal, idx) => (
                  <Card key={idx} className="bg-white border-primary/10 hover:border-primary/30 transition-colors">
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg text-primary">{meal}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-bold">Step-by-Step Recipes</h2>
              <Accordion type="single" collapsible className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
                {result.recipes.map((recipe, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border-b last:border-0 px-4">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                      Recipe Option {idx + 1}
                    </AccordionTrigger>
                    <AccordionContent className="whitespace-pre-line text-muted-foreground pb-6 leading-relaxed">
                      {recipe}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-bold text-chart-3 flex items-center gap-2">
                <Leaf className="w-6 h-6" />
                Healthier Organic Alternatives
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {result.healthierAlternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-chart-3/5 rounded-xl border border-chart-3/10">
                    <div className="w-2 h-2 rounded-full bg-chart-3 mt-2 shrink-0" />
                    <p className="text-sm font-medium">{alt}</p>
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
