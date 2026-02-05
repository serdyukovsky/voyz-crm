"use client"

import { useEffect, useState, useMemo } from 'react'
import { LayoutDashboard, Target, CheckSquare, BarChart3, ScrollText, Upload, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, Contact, Building2, Languages, MessageSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { useSidebar } from './sidebar-context'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useChatContext } from './chat-context'
import { useUserRole } from '@/hooks/use-user-role'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navItemsConfig = [
  { href: "/", icon: LayoutDashboard, key: "common.dashboard", adminOnly: false },
  { href: "/deals", icon: Target, key: "common.deals", adminOnly: false },
  { href: "/tasks", icon: CheckSquare, key: "common.tasks", adminOnly: false },
  { href: "/contacts", icon: Contact, key: "common.contacts", adminOnly: false },
  { href: "/companies", icon: Building2, key: "common.companies", adminOnly: true },
  { href: "/messages", icon: MessageSquare, key: "common.messages", adminOnly: true },
  { href: "/analytics", icon: BarChart3, key: "common.analytics", adminOnly: true },
  { href: "/logs", icon: ScrollText, key: "common.logs", adminOnly: true },
  { href: "/import-export", icon: Upload, key: "common.importExport", adminOnly: true },
  { href: "/users", icon: Users, key: "common.users", adminOnly: false },
  { href: "/settings", icon: Settings, key: "common.settings", adminOnly: false },
]

export function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const { t, language, setLanguage } = useTranslation()
  const chatContext = useChatContext()
  const { isAdmin } = useUserRole()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const updateTheme = () => {
      if (theme === 'dark') {
        setIsDark(true)
      } else if (theme === 'light') {
        setIsDark(false)
      } else if (theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    updateTheme()

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [theme, mounted])

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    return navItemsConfig
      .filter(item => !item.adminOnly || isAdmin)
      .map(item => ({
        ...item,
        label: t(item.key)
      }))
  }, [isAdmin, t])

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
              <img 
                src="/logo_voyz_crm.svg" 
                alt="Voyz CRM" 
                className={cn(
                  "h-4 w-auto transition-all duration-200",
                  isDark ? "invert brightness-0" : ""
                )}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full min-w-0">
              <img 
                src="/logo_voyz_crm.svg" 
                alt="Voyz CRM" 
                className={cn(
                  "h-4 w-auto flex-shrink-0 transition-all duration-200",
                  isDark ? "invert brightness-0" : ""
                )}
              />
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
            const isActive = pathname === item.href || (item.href === "/messages" && chatContext.isOpen)
            const Icon = item.icon
            
            // Special handling for Messages - open modal instead of navigating
            const handleClick = (e: React.MouseEvent) => {
              if (item.href === "/messages") {
                e.preventDefault()
                chatContext.openChat()
              }
            }
            
            const linkContent = (
              <Link
                to={item.href}
                onClick={handleClick}
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
