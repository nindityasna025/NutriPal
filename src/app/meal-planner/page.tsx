
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Clock, Plus, Utensils, Bell, Trash2, Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const scheduledMeals = [
  { id: 1, time: "08:30 AM", type: "Breakfast", name: "Oatmeal with Blueberries", calories: 320 },
  { id: 2, time: "12:30 PM", type: "Lunch", name: "Chicken Avocado Wrap", calories: 510 },
  { id: 3, time: "04:00 PM", type: "Snack", name: "Greek Yogurt & Nuts", calories: 180 },
  { id: 4, time: "07:30 PM", type: "Dinner", name: "Zucchini Noodles with Pesto", calories: 380 },
]

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDate(new Date())
  }, [])

  return (
    <div className="min-h-screen pb-20 md:pt-20 bg-background font-body">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-2">
              <Utensils className="text-primary w-8 h-8" />
              Daily Meal Schedule
            </h1>
            <p className="text-muted-foreground">Manage your meals and get timely reminders based on your schedule.</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" /> Add New Meal
          </Button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Selector */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
               <CardContent className="p-4">
                  {mounted ? (
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border-none"
                    />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Loading calendar...
                    </div>
                  )}
               </CardContent>
            </Card>

            <Card className="bg-accent/10 border-none rounded-3xl">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent-foreground flex items-center gap-2">
                   <Bell className="w-4 h-4" /> Reminders
                 </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  We&apos;ll notify you 30 minutes before each meal to help you prep and avoid last-minute junk food choices.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Meals Timeline */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-xl font-headline font-bold">
                Today&apos;s Schedule — {mounted && date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : "..."}
              </h2>
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-4 py-1">
                Total: 1,390 kcal
              </Badge>
            </div>

            <div className="space-y-4">
              {scheduledMeals.map((meal) => (
                <Card key={meal.id} className="group border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="text-center min-w-[80px]">
                            <p className="text-sm font-bold text-primary">{meal.time}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{meal.type}</p>
                         </div>
                         <div className="h-10 w-px bg-border" />
                         <div>
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{meal.name}</h3>
                            <p className="text-sm text-muted-foreground">{meal.calories} kcal</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                            <Edit2 className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <button className="w-full py-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Plus className="w-8 h-8" />
                  <span className="font-bold">Add Another Item</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
