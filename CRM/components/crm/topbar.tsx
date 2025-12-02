"use client"

import { useState } from 'react'
import { Search, Bell, Command, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface Notification {
  id: string
  title: string
  description: string
}

const initialNotifications: Notification[] = [
  { id: '1', title: 'New deal assigned', description: 'Acme Corp - $50,000 deal assigned to you' },
  { id: '2', title: 'Task completed', description: 'Sarah marked "Follow up call" as complete' },
  { id: '3', title: 'Deal stage changed', description: 'TechStart moved to "Negotiation" stage' },
]

export function Topbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  const handleLogout = async () => {
    try {
      const { logout } = await import('@/lib/api/auth')
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    navigate("/login")
  }

  const handleRemoveNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  return (
    <header 
      className="fixed left-60 right-0 top-0 z-10 h-12 border-b border-border/50 bg-card" 
      role="banner"
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input 
              type="search"
              placeholder={t('common.searchPlaceholder')}
              className="h-8 w-full border-0 bg-secondary/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={t('common.search')}
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 flex h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <Command className="h-3 w-3" />
              K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications with badge */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 relative hover:bg-secondary/50"
                aria-label={`${t('common.notifications')} (${notifications.length} ${t('common.unread')})`}
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{t('common.notifications')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('common.noNotifications')}
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className="group relative flex flex-col items-start gap-1 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm block">{notification.title}</span>
                          <span className="text-xs text-muted-foreground block mt-0.5">{notification.description}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={(e) => handleRemoveNotification(notification.id, e)}
                          aria-label={t('common.closeNotification')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={handleClearAll}
                        >
                          {t('common.clearAllNotifications')}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 w-8 rounded-full p-0 hover:bg-secondary/50"
                aria-label="User menu"
              >
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  AC
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Alex Chen</p>
                  <p className="text-xs text-muted-foreground">alex@pipeline.co</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings/profile">{t('settings.profile')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/preferences">{t('settings.title')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/shortcuts">{t('settings.keyboardShortcuts')}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                {t('settings.logOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
