"use client"

import { useEffect, useState } from 'react'
import { LayoutDashboard, Target, CheckSquare, BarChart3, ScrollText, Upload, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, Contact } from 'lucide-react'
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { useSidebar } from './sidebar-context'

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/deals", icon: Target, label: "Deals" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/contacts", icon: Contact, label: "Contacts" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/logs", icon: ScrollText, label: "Logs" },
  { href: "/import-export", icon: Upload, label: "Import/Export" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isExpanded = !isCollapsed || isHovered

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-20 h-screen border-r border-border/50 bg-sidebar transition-[width] duration-200 ease-out overflow-hidden",
        isExpanded ? "w-60" : "w-16"
      )}
      role="navigation" 
      aria-label="Main navigation"
      onMouseEnter={() => {
        if (isCollapsed) {
          setIsHovered(true)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-12 items-center border-b border-border/50 px-4">
          <div className="flex items-center gap-2 w-full">
            <div className="h-6 w-6 rounded-md bg-primary flex-shrink-0" aria-hidden="true" />
            {isExpanded && (
              <span className="text-sm font-medium text-sidebar-foreground whitespace-nowrap">
                Pipeline CRM
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-auto flex-shrink-0 p-1 rounded-md hover:bg-sidebar-accent/50 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/70" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-sidebar-foreground/70" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  isExpanded ? "gap-3 px-3 py-1.5" : "justify-center px-2 py-1.5",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {isExpanded && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border/50 p-2">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "flex w-full items-center rounded-md text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                isExpanded ? "gap-3 px-3 py-2" : "justify-center px-2 py-2"
              )}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={!isExpanded ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              )}
              {isExpanded && (
                <span className="flex-1 text-left whitespace-nowrap">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
