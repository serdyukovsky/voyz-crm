"use client"

import { useEffect, useState } from 'react'
import { LayoutDashboard, Target, CheckSquare, BarChart3, ScrollText, Upload, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, Contact, Building2, Languages } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { useSidebar } from './sidebar-context'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const navItemsConfig = [
  { href: "/", icon: LayoutDashboard, key: "common.dashboard" },
  { href: "/deals", icon: Target, key: "common.deals" },
  { href: "/tasks", icon: CheckSquare, key: "common.tasks" },
  { href: "/contacts", icon: Contact, key: "common.contacts" },
  { href: "/companies", icon: Building2, key: "common.companies" },
  { href: "/analytics", icon: BarChart3, key: "common.analytics" },
  { href: "/logs", icon: ScrollText, key: "common.logs" },
  { href: "/import-export", icon: Upload, key: "common.importExport" },
  { href: "/users", icon: Users, key: "common.users" },
  { href: "/settings", icon: Settings, key: "common.settings" },
]

export function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [isHovered, setIsHovered] = useState(false)
  const { t, language, setLanguage } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isExpanded = !isCollapsed || isHovered
  
  const navItems = navItemsConfig.map(item => ({
    ...item,
    label: t(item.key)
  }))

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
                {t('sidebar.pipelineCrm')}
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
                to={item.href}
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
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  "h-9 w-9"
                )}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                title={theme === "dark" ? t('sidebar.lightMode') : t('sidebar.darkMode')}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={cn(
                      "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      "h-9 w-9"
                    )}
                    aria-label="Select language"
                    title={language === 'en' ? 'Русский' : 'English'}
                  >
                    <Languages className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-20">
                  <DropdownMenuItem 
                    onClick={() => setLanguage('en')}
                    className={cn(
                      "cursor-pointer",
                      language === 'en' && "bg-accent"
                    )}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span>EN</span>
                      {language === 'en' && <span>✓</span>}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLanguage('ru')}
                    className={cn(
                      "cursor-pointer",
                      language === 'ru' && "bg-accent"
                    )}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span>RU</span>
                      {language === 'ru' && <span>✓</span>}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
