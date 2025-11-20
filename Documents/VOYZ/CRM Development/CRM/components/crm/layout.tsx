"use client"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
}

function LayoutContent({ children }: LayoutProps) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main 
        className={cn(
          "pt-12 transition-[margin-left] duration-200 ease-out",
          isCollapsed ? "ml-16" : "ml-60"
        )} 
        role="main"
      >
        {children}
      </main>
    </div>
  )
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

export { Layout as CRMLayout }
