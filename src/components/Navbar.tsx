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
      {/* Sidebar - Desktop (Pure White with Sharp Text) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen fixed left-0 top-0 z-[100] shadow-premium">
        <div className="p-10 mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">NutriPal</h1>
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
                  "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-foreground shadow-sm" 
                    : "text-foreground opacity-60 hover:bg-secondary/50 hover:opacity-100"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-105")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-8 border-t border-border/50">
          {user && (
            <Link 
              href="/profile"
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all",
                pathname === "/profile" ? "bg-secondary" : "hover:bg-secondary/30"
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-white shadow-premium">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary text-foreground font-black">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-[10px] font-black truncate uppercase tracking-tight text-foreground">{user.displayName || "User"}</p>
                <p className="text-[8px] text-foreground font-black uppercase tracking-[0.2em] opacity-40">Pro Member</p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Tab Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-border px-6 pt-4 pb-10 flex justify-around items-center">
        {navItems.concat([{ href: "/profile", label: "Profile", icon: User }]).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 flex-1 transition-all",
                isActive ? "text-primary scale-110" : "text-foreground opacity-60"
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
