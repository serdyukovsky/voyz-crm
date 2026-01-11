import { useState, useEffect } from "react"
import { LoginForm } from "@/components/crm/auth-forms"
import { useTheme } from 'next-themes'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { Sun, Moon, Languages } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const { theme, setTheme } = useTheme()
  const { t, language, setLanguage } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

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

  // Handle theme toggle
  const toggleTheme = () => {
    const currentTheme = theme || "dark"
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  const currentTheme = theme || "dark"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Logo */}
      {mounted && (
        <div 
          className={cn(
            "absolute inset-0 flex items-start justify-center pointer-events-none",
            "transition-opacity duration-300"
          )}
          style={{ opacity: 0.15, paddingTop: '5%' }}
        >
          <img 
            src="/voyz_logo_outline_stroke.svg" 
            alt="" 
            className={cn(
              "w-full max-w-4xl h-auto transition-all duration-300",
              isDark ? "invert brightness-0" : ""
            )}
            style={{ 
              transform: 'scale(1.2)',
            }}
            aria-hidden="true"
          />
        </div>
      )}
      
      <LoginForm />
      
      {/* Theme and Language Toggle - Bottom Left */}
      {mounted && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 z-10">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className={cn(
              "flex items-center justify-center rounded-md bg-card border border-border/50 text-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground",
              "h-9 w-9 shadow-sm"
            )}
            aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
            title={currentTheme === "dark" ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {currentTheme === "dark" ? (
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
                  "flex items-center justify-center rounded-md bg-card border border-border/50 text-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground",
                  "h-9 w-9 shadow-sm"
                )}
                aria-label={t('common.selectLanguage')}
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
  )
}

