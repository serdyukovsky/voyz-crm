"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const SIDEBAR_STORAGE_KEY = 'crm-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Загружаем состояние из localStorage при инициализации
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    if (typeof window === 'undefined') return false
    
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  // Сохраняем состояние в localStorage при изменении
  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error)
    }
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

