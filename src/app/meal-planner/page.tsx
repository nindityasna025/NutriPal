
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Plus, Utensils, Bell, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { addMonths, subMonths, format, startOfToday } from "date-fns"

const scheduledMeals = [
  { id: 1, time: "08:30 AM", type: "Breakfast", name: "Oatmeal with Blueberries", calories: 320 },
  { id: 2, time: "12:30 PM", type: "Lunch", name: "Chicken Avocado Wrap", calories: 510 },
  { id: 3, time: "04:00 PM", type: "Snack", name: "Greek Yogurt & Nuts", calories: 180 },
  { id: 4, time: "07:30 PM", type: "Dinner", name: "Zucchini Noodles with Pesto", calories: 380 },
]

export default function MealPlannerPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const today = startOfToday()
    setDate(today)
    setCurrentMonth(today)
    setMounted(true)
  }, [])

  const handlePrevMonth = () => currentMonth && setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => currentMonth && setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    const today = startOfToday()
    setCurrentMonth(today)
    setDate(today)
  }

  if (!mounted || !currentMonth) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening your meal planner...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pt-20 bg-background font-body">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-500">
        <section className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-headline font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleToday}
              className="rounded-xl h-10 px-4 font-bold border-border bg-white"
            >
              today
            </Button>
            <div className="flex items-center border border-border rounded-xl bg-white overflow-hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                className="h-10 w-10 rounded-none border-r border-border hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-10 w-10 rounded-none hover:bg-muted"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-10 px-6 font-bold shadow-lg shadow-primary/20 ml-2">
              <Plus className="w-4 h-4 mr-2" /> Add Meal
            </Button>
          </div>
        </section>

        <section className="w-full">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-none border-none"
              />
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-headline font-bold">
                {date ? format(date, "MMMM d, yyyy") : "Select a date"}
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
                      You will receive notifications 30 minutes before each meal time to help you stay on track.
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
                         "Prepare vegetable cuts at night to save time for breakfast."
                      </li>
                      <li className="flex items-start gap-2 italic">
                         "Don't forget to drink 2 glasses of water before lunch."
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
