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
  { href: "/planner", label: "Planner", icon: Sparkles },
  { href: "/record", label: "Record", icon: Camera },
  { href: "/profile", label: "Profile", icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const { auth } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide navbar on login and onboarding pages
  if (!mounted || isUserLoading) return null
  if (!user || pathname === "/login" || pathname === "/onboarding") return null

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border px-4 py-3 md:top-0 md:bottom-auto md:border-t-0 md:border-b shadow-lg md:shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-2 font-headline font-bold text-xl text-primary">
          <div className="bg-primary p-1.5 rounded-lg">
            <Utensils className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="tracking-tight text-foreground">NutriPal</span>
        </div>
        
        <div className="flex w-full md:w-auto justify-around md:justify-end items-center gap-1 md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary md:bg-primary/10 font-bold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
          
          <div className="hidden md:block ml-4 pl-4 border-l border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-bold">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
