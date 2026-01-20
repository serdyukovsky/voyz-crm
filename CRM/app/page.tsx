"use client"

import { CRMLayout } from "@/components/crm/layout"
import { Dashboard } from "@/components/crm/dashboard"
import { useAuthGuard } from '@/hooks/use-auth-guard'

export default function DashboardPage() {
  useAuthGuard()
  
  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Alex</p>
          </div>
        </div>

        {/* Dashboard Content */}
        <Dashboard />
      </div>
    </CRMLayout>
  )
}
