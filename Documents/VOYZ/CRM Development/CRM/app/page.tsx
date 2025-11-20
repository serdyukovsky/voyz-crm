"use client"

import { CRMLayout } from "@/components/crm/layout"
import { Dashboard } from "@/components/crm/dashboard"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Alex</p>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Dashboard Content */}
        <Dashboard />
      </div>
    </CRMLayout>
  )
}
