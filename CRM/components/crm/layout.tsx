"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import { SearchProvider } from "./search-context"
import { QuickSearch } from "@/components/shared/quick-search"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
}

function LayoutContent({ children }: LayoutProps) {
  const { isCollapsed } = useSidebar()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main 
        className={cn(
          "pt-12 transition-[margin-left] duration-300 ease-in-out",
          isCollapsed ? "ml-16" : "ml-60"
        )} 
        role="main"
      >
        {children}
      </main>
      <QuickSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <SearchProvider>
        <LayoutContent>{children}</LayoutContent>
      </SearchProvider>
    </SidebarProvider>
  )
}

export { Layout as CRMLayout }
