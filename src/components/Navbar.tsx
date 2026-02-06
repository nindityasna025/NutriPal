
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Utensils, Camera, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/firebase"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: Utensils },
  { href: "/record", label: "Record", icon: Camera },
  { href: "/profile", label: "Profile", icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const { user } = useUser()

  if (!user || pathname === "/login" || pathname === "/onboarding") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border px-4 py-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-2 font-headline font-bold text-xl text-primary">
          <Utensils className="fill-primary" />
          <span>NutriPal</span>
        </div>
        <div className="flex w-full md:w-auto justify-around md:justify-end gap-1 md:gap-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-all",
                  isActive 
                    ? "text-primary bg-primary/10 font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] md:text-sm">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
