"use client"

import { useRouter } from 'next/navigation'
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, User, Keyboard, LogOut } from 'lucide-react'
import Link from "next/link"

export default function SettingsPage() {
  const router = useRouter()

  const handleLogout = () => {
    // In a real app, clear tokens/session here
    router.push("/login")
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          <Link href="/settings/profile">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Profile</CardTitle>
                    <CardDescription className="text-xs">Personal information</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings/preferences">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
                    <CardDescription className="text-xs">Notifications & security</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings/shortcuts">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Shortcuts</CardTitle>
                    <CardDescription className="text-xs">Keyboard shortcuts</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card 
            className="border-border border-destructive/50 bg-card hover:bg-destructive/5 transition-colors cursor-pointer h-full"
            onClick={handleLogout}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-destructive">Log Out</CardTitle>
                  <CardDescription className="text-xs">Sign out of your account</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </CRMLayout>
  )
}
