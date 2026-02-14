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
  { href: "/record", label: "Snap", icon: Camera },
  { href: "/planner", label: "Explore", icon: Sparkles },
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
      {/* Sidebar - Desktop (Pure White) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-muted h-screen fixed left-0 top-0 z-[100] shadow-premium">
        <div className="p-10 mb-6">
          <h1 className="text-2xl font-black tracking-tighter text-primary uppercase">NutriPal</h1>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 px-5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground shadow-none"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-8 border-t border-muted/50">
          {user && (
            <Link 
              href="/profile"
              className={cn(
                "flex items-center gap-4 p-3 rounded-[1.25rem] transition-all",
                pathname === "/profile" ? "bg-secondary shadow-sm" : "hover:bg-secondary/50"
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-white shadow-premium">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground font-black">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black truncate uppercase tracking-tight">{user.displayName || "User"}</p>
                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-50">Premium</p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Tab Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-muted px-6 pt-4 pb-10 flex justify-around items-center">
        {navItems.concat([{ href: "/profile", label: "Profile", icon: User }]).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 flex-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
