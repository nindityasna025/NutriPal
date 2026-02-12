"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Utensils, Camera, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/firebase"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/meal-planner", label: "Plan", icon: Utensils },
  { href: "/planner", label: "Explore", icon: Sparkles },
  { href: "/record", label: "Snap", icon: Camera },
]

export function Navbar() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  
  const isAuthPage = pathname === "/login" || pathname === "/onboarding"
  if (isAuthPage) return null
  if (!user && !isUserLoading) return null

  return (
    <>
      {/* Desktop Sidebar - Simplified Minimalist */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen fixed left-0 top-0 z-[100]">
        <div className="p-10 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground w-10 h-10 rounded-xl flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="font-black text-2xl tracking-tighter">NutriPal</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-6">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          {user && (
            <Link 
              href="/profile"
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-accent group",
                pathname === "/profile" && "bg-accent"
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-black truncate">{user.displayName || "User"}</span>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">View Profile</span>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav - Optimized for Mobile-First */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-border px-4 py-3 flex justify-around items-center rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        {navItems.concat([{ href: "/profile", label: "Profile", icon: User }]).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[3px]")} />
              <span className="text-[8px] uppercase font-black tracking-widest">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
