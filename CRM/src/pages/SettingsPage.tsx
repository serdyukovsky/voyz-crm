import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, User, Keyboard, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { logout } from '@/lib/api/auth'

export default function SettingsPage() {
  const { t } = useTranslation()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    window.location.href = '/'
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('settings.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings.manageAccount')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          <Link to="/settings/profile">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{t('settings.profile')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('settings.personalInformation')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/settings/preferences">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{t('settings.preferences')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('settings.notificationsSecurity')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/settings/pipelines">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{t('settings.pipelines')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('settings.managePipelinesStages')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/settings/users">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{t('settings.users')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('settings.manageTeamRoles')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/settings/shortcuts">
            <Card className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{t('settings.shortcuts')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('settings.keyboardShortcuts')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card 
            className="border-border border-destructive/50 bg-card hover:bg-destructive/5 transition-colors cursor-pointer h-full"
            onClick={handleLogout}
          >
            <CardHeader className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 flex-shrink-0">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold text-destructive">{t('settings.logOut')}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{t('settings.signOut')}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </CRMLayout>
  )
}

