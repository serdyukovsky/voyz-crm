import { useState } from "react"
import { Link } from "react-router-dom"
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft } from 'lucide-react'

export default function PreferencesPage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Preferences</h1>
            <p className="text-sm text-muted-foreground">Manage notifications and security settings</p>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email about your activity</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Deal updates</p>
                  <p className="text-xs text-muted-foreground">Get notified when deals change stage</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Task reminders</p>
                  <p className="text-xs text-muted-foreground">Receive reminders for upcoming tasks</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly reports</p>
                  <p className="text-xs text-muted-foreground">Get a summary email every Monday</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Security</CardTitle>
              <CardDescription>Manage your password and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-xs font-medium">Current Password</Label>
                <Input id="currentPassword" type="password" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-medium">New Password</Label>
                <Input id="newPassword" type="password" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" className="h-9" />
              </div>
              <Button size="sm" variant="outline">Update Password</Button>
            </CardContent>
          </Card>

          <Card className="border-border border-destructive/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Link to="/settings">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
    </CRMLayout>
  )
}

