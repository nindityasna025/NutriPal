
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Utensils, Camera, User, LogOut, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Meal Planner", icon: Sparkles },
  { href: "/record", label: "Record & Recap", icon: Camera },
  { href: "/profile", label: "My Profile", icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  
  // Don't show navbar on login or onboarding pages
  const isAuthPage = pathname === "/login" || pathname === "/onboarding"
  if (isAuthPage) return null

  // If we're not loading and there's no user, we might want to hide it too
  if (!user && !isUserLoading && pathname !== "/login") return null

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen fixed left-0 top-0 z-[100] shadow-sm">
        <div className="p-8 flex items-center gap-3 border-b">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <Utensils className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-headline font-black text-2xl tracking-tighter">NutriPal</span>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group",
                  isActive 
                    ? "bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 scale-[1.02]" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground font-bold"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-2xl px-5 py-7 font-black"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-border px-2 py-4 flex justify-around items-center shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-t-[2.5rem]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[3px]")} />
              <span className="text-[9px] uppercase font-black tracking-widest">{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
