
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Flame, RefreshCw, Smartphone, Watch, CheckCircle2, XCircle } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import { useToast } from "@/hooks/use-toast"

const chartData = [
  { day: "Mon", kcal: 1800 },
  { day: "Tue", kcal: 2100 },
  { day: "Wed", kcal: 1950 },
  { day: "Thu", kcal: 2400 },
  { day: "Fri", kcal: 2200 },
  { day: "Sat", kcal: 1600 },
  { day: "Sun", kcal: 1400 },
]

export default function FitnessPage() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setLastSync(new Date().toLocaleTimeString())
  }, [])

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date().toLocaleTimeString())
      toast({ title: "Sync Complete", description: "All device metrics updated." })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-24">
        <header className="space-y-1 pt-safe md:pt-4 text-center animate-in fade-in duration-500">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase text-center">
            Fitness Sync
          </h1>
          <p className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] opacity-40">Activity Integration</p>
        </header>
        
        <div className="flex flex-col md:flex-row md:items-center justify-center gap-4">
          <button 
            onClick={handleSync} 
            disabled={syncing}
            className="rounded-full bg-white border border-border text-foreground hover:bg-muted font-semibold shadow-sm px-10 h-12 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Syncing..." : "Sync Devices"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Connected Devices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Watch className="text-primary w-6 h-6" />
                  <div>
                    <p className="font-bold">Apple Watch S9</p>
                    <p className="text-xs text-muted-foreground">Connected • Active</p>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-muted-foreground w-6 h-6" />
                  <div>
                    <p className="font-bold">Health Connect</p>
                    <p className="text-xs text-muted-foreground">Synced via iPhone</p>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Last synced: {lastSync}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Weekly Calories Burned</CardTitle>
                <CardDescription>Based on active workout minutes and steps.</CardDescription>
              </div>
              <Flame className="text-primary w-8 h-8" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 900 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 900 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--primary)/0.1)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-border shadow-lg rounded-lg">
                              <p className="font-bold text-sm">{`${payload[0].value} kcal`}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="kcal" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
