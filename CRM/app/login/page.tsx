"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/crm/auth-forms"
import { useTheme } from 'next-themes'
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const { theme } = useTheme()
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
    </div>
  )
}
