"use client"

import { useState, useRef, useEffect } from 'react'
import { Search, Bell, Command, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useSidebar } from './sidebar-context'
import { useSearch } from './search-context'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { DealSearchPanel, type DealSearchFilters } from './deal-search-panel'

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

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role?: string
  avatar?: string
}

export function Topbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isCollapsed } = useSidebar()
  const { searchValue, setSearchValue } = useSearch()
  const { logout: logoutFromContext } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<DealSearchFilters | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)

  // Check if we're on the deals page
  const isDealsPage = location.pathname.startsWith('/deals')

  // Close search panel when leaving deals page
  useEffect(() => {
    if (!isDealsPage && searchPanelOpen) {
      setSearchPanelOpen(false)
    }
  }, [isDealsPage, searchPanelOpen])

  // Load user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const userData = JSON.parse(userStr)
          setUser(userData)
        } catch (error) {
          console.error('Failed to parse user data from localStorage:', error)
        }
      }
    }
  }, [])

  // Get user initials for avatar
  const getUserInitials = (user: User | null): string => {
    if (!user) return 'U'
    const first = user.firstName?.[0]?.toUpperCase() || ''
    const last = user.lastName?.[0]?.toUpperCase() || ''
    return first + last || user.email?.[0]?.toUpperCase() || 'U'
  }

  // Get user full name
  const getUserName = (user: User | null): string => {
    if (!user) return 'User'
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.email || 'User'
  }

  const handleLogout = async () => {
    try {
      await logoutFromContext()
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback navigation if logout fails
      navigate("/login", { replace: true })
    }
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
      className={cn(
        "fixed right-0 top-0 z-10 h-12 border-b border-border/50 bg-card",
        "transition-[left] duration-300 ease-in-out",
        isCollapsed ? "left-16" : "left-60"
      )} 
      role="banner"
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="flex flex-1 items-center gap-4 relative">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
            <Input 
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('common.searchPlaceholder') || 'Поиск и фильтр'}
              className="h-8 w-full border-0 bg-secondary/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              aria-label={t('common.search')}
              onFocus={() => {
                if (isDealsPage) {
                  setSearchPanelOpen(true)
                }
              }}
            />
            {searchValue.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setSearchValue('')
                  searchInputRef.current?.focus()
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 z-30 h-3.5 w-3.5 flex items-center justify-center rounded-sm hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={t('common.clear') || 'Очистить'}
                style={{ pointerEvents: 'auto' }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <kbd className="pointer-events-none absolute right-2 top-1/2 flex h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 z-10">
              <Command className="h-3 w-3" />
              K
            </kbd>
          </div>
          
          {/* Deal Search Panel - позиционируется под инпутом, только на странице сделок */}
          {isDealsPage && (
            <DealSearchPanel
              open={searchPanelOpen}
              onClose={() => setSearchPanelOpen(false)}
              onApplyFilters={(filters) => {
                setAppliedFilters(filters)
                // Здесь можно добавить логику применения фильтров
                // Например, обновить URL или передать фильтры в родительский компонент
                console.log('Applied filters:', filters)
              }}
            />
          )}
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={getUserName(user)} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{getUserName(user)}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
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
