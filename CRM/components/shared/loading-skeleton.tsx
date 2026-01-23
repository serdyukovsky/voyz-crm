"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

export function PageSkeleton() {
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in-50 duration-500">
        {/* Logo with pulse animation */}
        {mounted && (
          <div className="flex items-center justify-center">
            <img 
              src="/logo_voyz_crm.svg" 
              alt="Voyz CRM" 
              className={cn(
                "h-16 w-auto animate-logo-pulse",
                isDark ? "invert brightness-0" : "",
              )}
            />
          </div>
        )}
        
        {/* Loading dots with wave animation */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full bg-primary animate-dot-bounce"
              style={{ animationDelay: '0s' }}
            />
            <div 
              className="h-2 w-2 rounded-full bg-primary animate-dot-bounce"
              style={{ animationDelay: '0.2s' }}
            />
            <div 
              className="h-2 w-2 rounded-full bg-primary animate-dot-bounce"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Загрузка...</p>
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("border shadow-sm animate-in fade-in-50 duration-300", className)}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-md animate-pulse-subtle" />
        <Skeleton className="h-3 w-56 rounded-sm animate-pulse-subtle" style={{ animationDelay: '100ms' }} />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-sm animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
          <Skeleton className="h-4 w-5/6 rounded-sm animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
          <Skeleton className="h-4 w-4/6 rounded-sm animate-pulse-subtle" style={{ animationDelay: '400ms' }} />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in-50 duration-300">
      <div className="flex gap-4 p-4 bg-card rounded-lg border">
        <Skeleton className="h-10 flex-1 rounded-md animate-pulse-subtle" />
        <Skeleton className="h-10 flex-1 rounded-md animate-pulse-subtle" style={{ animationDelay: '100ms' }} />
        <Skeleton className="h-10 flex-1 rounded-md animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
        <Skeleton className="h-10 w-24 rounded-md animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1 rounded-md animate-pulse-subtle" style={{ animationDelay: `${(i + 1) * 100}ms` }} />
              <Skeleton className="h-16 flex-1 rounded-md animate-pulse-subtle" style={{ animationDelay: `${(i + 1) * 100 + 50}ms` }} />
              <Skeleton className="h-16 flex-1 rounded-md animate-pulse-subtle" style={{ animationDelay: `${(i + 1) * 100 + 100}ms` }} />
              <Skeleton className="h-16 w-24 rounded-md animate-pulse-subtle" style={{ animationDelay: `${(i + 1) * 100 + 150}ms` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in-50 duration-300">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full animate-pulse-subtle" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-56 rounded-md animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                <Skeleton className="h-3.5 w-40 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 100}ms` }} />
              </div>
              <Skeleton className="h-8 w-24 rounded-md animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 150}ms` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in-50 duration-300">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-28 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100}ms` }} />
            <Skeleton className="h-5 w-5 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 50}ms` }} />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-36 mb-2 rounded-md animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 100}ms` }} />
            <Skeleton className="h-3.5 w-24 rounded-sm animate-pulse-subtle" style={{ animationDelay: `${i * 100 + 150}ms` }} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex-1 space-y-2.5">
          <div className="h-9 bg-gradient-to-r from-muted via-muted to-transparent rounded-lg animate-pulse"></div>
          <div className="h-4 w-2/3 bg-gradient-to-r from-muted/50 via-muted/30 to-transparent rounded-md animate-pulse" style={{ animationDelay: '100ms' }}></div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="h-10 w-24 bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse"></div>
          <div className="h-10 w-24 bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse" style={{ animationDelay: '100ms' }}></div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Info (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="h-6 w-48 bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <div className="h-4 w-32 bg-gradient-to-r from-muted/40 to-transparent rounded-sm animate-pulse"></div>
                  <div className="h-8 w-full bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse" style={{ animationDelay: `${50 + i * 100}ms` }}></div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="h-6 w-40 bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse"></div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-r from-muted via-muted to-transparent animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-40 bg-gradient-to-r from-muted via-muted to-transparent rounded-sm animate-pulse"></div>
                  <div className="h-3 w-32 bg-gradient-to-r from-muted/50 to-transparent rounded-sm animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metadata (1/3 width) */}
        <div className="space-y-6">
          {/* Stage Card */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="h-5 w-20 bg-gradient-to-r from-muted to-transparent rounded-sm animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="h-9 w-full bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse"></div>
              <div className="h-4 w-full bg-gradient-to-r from-muted/40 to-transparent rounded-sm animate-pulse"></div>
            </CardContent>
          </Card>

          {/* Properties Card */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="h-5 w-24 bg-gradient-to-r from-muted to-transparent rounded-sm animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 bg-gradient-to-r from-muted/40 to-transparent rounded-sm animate-pulse"></div>
                  <div className="h-5 w-full bg-gradient-to-r from-muted via-muted to-transparent rounded-sm animate-pulse" style={{ animationDelay: `${50 + i * 100}ms` }}></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section - Activity/Timeline */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-muted/20 to-transparent">
          <div className="flex gap-6">
            <div className="h-5 w-20 bg-gradient-to-r from-muted via-muted to-transparent rounded-sm animate-pulse"></div>
            <div className="h-5 w-24 bg-gradient-to-r from-muted/50 to-transparent rounded-sm animate-pulse"></div>
            <div className="h-5 w-20 bg-gradient-to-r from-muted/50 to-transparent rounded-sm animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 pb-6 border-b last:border-b-0">
              <div className="h-4 w-40 bg-gradient-to-r from-muted/50 to-transparent rounded-sm animate-pulse"></div>
              <div className="h-20 w-full bg-gradient-to-r from-muted via-muted to-transparent rounded-md animate-pulse" style={{ animationDelay: `${100 + i * 200}ms` }}></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}






