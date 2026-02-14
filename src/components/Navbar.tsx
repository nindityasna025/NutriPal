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
      {/* Material Design 3 Navigation Rail - Desktop */}
      <aside className="hidden md:flex flex-col w-20 bg-card border-r border-border h-screen fixed left-0 top-0 z-[100] elevation-1">
        <div className="p-5 flex justify-center mb-8">
          <div className="bg-primary text-primary-foreground w-12 h-12 rounded-2xl flex items-center justify-center elevation-2">
            <Utensils className="w-6 h-6" />
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 group transition-all",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-14 h-8 rounded-full flex items-center justify-center transition-all",
                  isActive ? "bg-primary/10" : "group-hover:bg-muted"
                )}>
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 flex justify-center border-t border-border">
          {user && (
            <Link href="/profile">
              <Avatar className={cn(
                "h-12 w-12 border-2 transition-all hover:scale-105",
                pathname === "/profile" ? "border-primary shadow-md" : "border-white"
              )}>
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/5 text-primary font-bold text-sm">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </aside>

      {/* Material Design 3 Navigation Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-card border-t border-border px-2 py-3 flex justify-around items-center rounded-t-[1.5rem] elevation-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {navItems.concat([{ href: "/profile", label: "Profile", icon: User }]).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 transition-all",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-16 h-8 rounded-full flex items-center justify-center transition-all",
                isActive ? "bg-primary/10" : ""
              )}>
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}