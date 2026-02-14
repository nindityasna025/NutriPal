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
      {/* iOS Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border/50 h-screen fixed left-0 top-0 z-[100]">
        <div className="p-8 mb-4">
          <h1 className="text-2xl font-extrabold tracking-tighter text-primary">NutriPal</h1>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-ios-lg" 
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-105")} />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-border/30">
          {user && (
            <Link 
              href="/profile"
              className={cn(
                "flex items-center gap-3 p-2 rounded-2xl transition-all",
                pathname === "/profile" ? "bg-secondary" : "hover:bg-secondary/50"
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{user.displayName || "User"}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Pro Member</p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* iOS Tab Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] glass border-t border-border/20 px-4 pt-3 pb-8 flex justify-around items-center">
        {navItems.concat([{ href: "/profile", label: "Profile", icon: User }]).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 transition-all duration-300",
                isActive ? "text-primary scale-105" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}