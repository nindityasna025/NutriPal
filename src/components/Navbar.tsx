
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Utensils, Camera, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/firebase"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meal-planner", label: "Meal Planner", icon: Utensils },
  { href: "/planner", label: "AI Curation", icon: Sparkles },
  { href: "/record", label: "Record & Recap", icon: Camera },
  { href: "/profile", label: "My Profile", icon: User },
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
  if (!user && !isUserLoading && pathname !== "/login") return null

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen fixed left-0 top-0 z-[100] shadow-sm">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-primary/20 p-2.5 rounded-2xl">
            <Utensils className="w-6 h-6 text-primary" />
          </div>
          <span className="font-headline font-black text-2xl tracking-tighter text-foreground">NutriPal</span>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-5 px-6 py-4 rounded-[1.5rem] transition-all duration-300 group",
                  isActive 
                    ? "bg-primary/10 text-foreground font-black border border-primary/20" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground font-bold"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t mt-auto">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 rounded-2xl border border-transparent">
              <Avatar className="h-9 w-9 border border-primary/20">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black truncate">{user.displayName || "Demo User"}</span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Active Account</span>
              </div>
            </div>
          )}
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
