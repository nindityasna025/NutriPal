
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Clock, Plus, Utensils, Bell, Trash2, Edit2, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

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
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="text-primary w-8 h-8" />
              Meal Planning Calendar
            </h1>
            <p className="text-muted-foreground">Schedule your nutrition and track your daily caloric intake visually.</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="rounded-xl h-12 px-6 font-bold border-border bg-white">
                Today
             </Button>
             <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> Add New Meal
             </Button>
          </div>
        </section>

        {/* Full Width Calendar Grid */}
        <section className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {mounted ? (
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-none border-none"
                />
              ) : (
                <div className="w-full p-8">
                  <Skeleton className="h-[600px] w-full rounded-2xl" />
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Schedule Section Below */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-headline font-bold">
                {mounted && date ? (
                  `Schedule for ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                ) : (
                  <Skeleton className="h-8 w-64" />
                )}
              </h2>
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-4 py-1 font-bold">
                Total: 1,390 kcal
              </Badge>
            </div>

            <div className="space-y-4">
              {scheduledMeals.map((meal) => (
                <Card key={meal.id} className="group border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden border-l-8 border-l-primary bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                         <div className="text-center min-w-[100px]">
                            <p className="text-lg font-bold text-primary">{meal.time}</p>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{meal.type}</p>
                         </div>
                         <div className="h-12 w-px bg-border" />
                         <div>
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{meal.name}</h3>
                            <p className="text-sm text-muted-foreground">{meal.calories} kcal • Low Sodium • High Protein</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full hover:bg-primary/5">
                            <Edit2 className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/5">
                            <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <Card className="bg-primary border-none rounded-3xl text-primary-foreground shadow-lg shadow-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" /> 
                    Meal Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-sm opacity-90 leading-relaxed font-medium">
                      Anda akan menerima notifikasi 30 menit sebelum setiap waktu makan untuk membantu persiapan menu sehat Anda.
                   </p>
                   <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 font-bold rounded-xl h-11">
                      Manage Notifications
                   </Button>
                </CardContent>
             </Card>

             <Card className="border-none rounded-3xl shadow-sm bg-accent/10 border-accent/20">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-accent-foreground" />
                      Prep Tips
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2 italic">
                         "Siapkan potongan sayur di malam hari untuk menghemat waktu sarapan."
                      </li>
                      <li className="flex items-start gap-2 italic">
                         "Jangan lupa minum 2 gelas air putih sebelum makan siang."
                      </li>
                   </ul>
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
