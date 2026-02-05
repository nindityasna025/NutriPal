import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Activity, Clock, Flame, Footprints, Info, Plus, Zap } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function Dashboard() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-healthy-food')

  return (
    <div className="min-h-screen pb-20 md:pt-20 bg-background font-body">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Header */}
        <section className="space-y-2">
          <h1 className="text-3xl font-headline font-bold text-foreground">G&apos;day, Alex! 👋</h1>
          <p className="text-muted-foreground">You&apos;re doing great today. Stay on track with your nutrition goals.</p>
        </section>

        {/* Hero Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Calories Consumed</CardTitle>
              <Flame className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,420 / 2,100 kcal</div>
              <Progress value={67} className="mt-3" />
              <p className="text-xs text-muted-foreground mt-2">680 kcal remaining for today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Physical Activity</CardTitle>
              <Footprints className="w-4 h-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8,432 steps</div>
              <Progress value={84} className="mt-3" />
              <p className="text-xs text-muted-foreground mt-2">Goal: 10,000 steps</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Water Intake</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.5 / 2.5 L</div>
              <Progress value={60} className="mt-3" />
              <p className="text-xs text-muted-foreground mt-2">4 glasses to go!</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Meal Reminder */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-headline font-bold">Next Scheduled Meal</h2>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Clock className="w-4 h-4 mr-2" />
                12:30 PM (Lunch)
              </Button>
            </div>
            <Card className="overflow-hidden group cursor-pointer border-none shadow-md transition-all hover:shadow-lg">
              <div className="relative h-48 w-full">
                <Image 
                  src={heroImage?.imageUrl || "https://picsum.photos/seed/nutri1/1200/600"} 
                  alt="Recommended Lunch"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  data-ai-hint="healthy lunch"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold">Grilled Salmon & Quinoa</h3>
                  <p className="text-sm text-white/80">High protein • 450 kcal</p>
                </div>
              </div>
              <CardContent className="pt-4 flex justify-between items-center bg-white">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">Low Carb</span>
                  <span className="px-2 py-1 bg-accent/20 text-accent-foreground text-xs rounded-full font-medium">Heart Healthy</span>
                </div>
                <Button variant="default" size="sm">Log Meal</Button>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="space-y-4">
            <h2 className="text-xl font-headline font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/40">
                <Plus className="w-6 h-6" />
                <span>Log Snack</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl hover:bg-accent/5 hover:border-accent/40">
                <Zap className="w-6 h-6" />
                <span>Find Deals</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl hover:bg-chart-3/5 hover:border-chart-3/40">
                <Info className="w-6 h-6" />
                <span>Diet Plan</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl hover:bg-blue-500/5 hover:border-blue-500/40">
                <Activity className="w-6 h-6" />
                <span>Sync Fit</span>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
