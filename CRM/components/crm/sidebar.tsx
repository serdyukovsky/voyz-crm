"use client"

import { useEffect, useState } from 'react'
import { LayoutDashboard, Target, CheckSquare, BarChart3, ScrollText, Upload, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, Contact, Building2, Languages } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { useSidebar } from './sidebar-context'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const { t, language, setLanguage } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const navItems = navItemsConfig.map(item => ({
    ...item,
    label: t(item.key)
  }))

  return (
    <TooltipProvider delayDuration={400}>
      <aside 
        className={cn(
          "fixed left-0 top-0 z-20 h-screen border-r border-border/50 bg-sidebar",
          "transition-all duration-300 ease-in-out will-change-[width]",
          "overflow-hidden",
          isCollapsed ? "w-16" : "w-60"
        )}
        role="navigation" 
        aria-label="Main navigation"
      >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-12 items-center border-b border-border/50 px-4">
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full relative">
              <div className="h-6 w-6 rounded-md bg-primary flex-shrink-0" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full min-w-0">
              <div className="h-6 w-6 rounded-md bg-primary flex-shrink-0" aria-hidden="true" />
              <span 
                className={cn(
                  "text-sm font-medium text-sidebar-foreground whitespace-nowrap",
                  "transition-all duration-300 ease-in-out",
                  "overflow-hidden block",
                  "opacity-100 w-auto"
                )}
              >
                {t('sidebar.pipelineCrm')}
              </span>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto flex-shrink-0 p-1 rounded-md hover:bg-sidebar-accent/50 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-all duration-200",
                  "min-w-0",
                  isCollapsed ? "justify-center px-2 py-1.5" : "gap-3 px-3 py-1.5",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span 
                  className={cn(
                    "whitespace-nowrap overflow-hidden block",
                    "transition-all duration-300 ease-in-out",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )

            // Показываем tooltip только когда меню свернуто
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="z-[60]">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
          
          {/* Кнопка разворачивания - только когда свернуто, под пунктами меню */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(false)}
                  className={cn(
                    "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    "w-full h-9 mt-0.5"
                  )}
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="z-[60]">
                {t('sidebar.expand') || 'Развернуть меню'}
              </TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-border/50 p-2">
          {mounted && (
            <div className={cn(
              "flex gap-2",
              isCollapsed ? "flex-col items-center" : "flex-row items-center"
            )}>
              {/* Language Switcher - первый */}
              <DropdownMenu>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className={cn(
                            "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            "h-9 w-9"
                          )}
                          aria-label="Select language"
                        >
                          <Languages className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {language === 'en' ? 'Русский' : 'English'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(
                        "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        "h-9 w-9"
                      )}
                      aria-label="Select language"
                    >
                      <Languages className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                )}
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

              {/* Theme Toggle - второй */}
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className={cn(
                        "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        "h-9 w-9"
                      )}
                      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Moon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {theme === "dark" ? t('sidebar.lightMode') : t('sidebar.darkMode')}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={cn(
                    "flex items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    "h-9 w-9"
                  )}
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
    </TooltipProvider>
  )
}
