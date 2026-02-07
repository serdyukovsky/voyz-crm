"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCurrentUser, logout as logoutApi, refreshToken, type User } from '@/lib/api/auth'
import { UnauthorizedError, NetworkError, setGlobalBackendUnavailableHandler } from '@/lib/api/api-client'

/** Decode JWT payload without external library */
function parseJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.exp ?? null
  } catch {
    return null
  }
}

/** Milliseconds to refresh before token expires */
const REFRESH_BEFORE_MS = 2 * 60 * 1000 // 2 minutes

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  authStatus: AuthStatus
  isBackendUnavailable: boolean
  login: (user: User, token: string) => void
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false)
  const isLoggingOutRef = useRef(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toastShownRef = useRef(false)

  // Set up backend unavailable handler
  useEffect(() => {
    setGlobalBackendUnavailableHandler((isUnavailable: boolean) => {
      setIsBackendUnavailable(isUnavailable)
    })
  }, [])

  // Handle redirect when backend is unavailable and user is not authenticated
  useEffect(() => {
    if (isBackendUnavailable && authStatus === 'unauthenticated' && location.pathname !== '/login') {
      // Redirect to login if backend is unavailable and user is not authenticated
      navigate('/login', { replace: true })
    }
  }, [isBackendUnavailable, authStatus, navigate, location.pathname])

  // Show toast notification when backend becomes unavailable
  useEffect(() => {
    if (isBackendUnavailable && authStatus === 'authenticated' && !toastShownRef.current) {
      toastShownRef.current = true
      toast.warning('Backend недоступен', {
        description: 'Не удается подключиться к серверу. Ваше состояние аутентификации сохранено. Соединение будет восстановлено автоматически.',
        duration: 5000,
      })
    } else if (!isBackendUnavailable) {
      // Reset toast flag when backend becomes available
      toastShownRef.current = false
    }
  }, [isBackendUnavailable, authStatus])

  // Schedule proactive token refresh before expiry
  const scheduleTokenRefresh = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    const exp = parseJwtExp(token)
    if (!exp) return

    const now = Date.now()
    const expiresAt = exp * 1000
    const refreshAt = expiresAt - REFRESH_BEFORE_MS
    const delay = refreshAt - now

    if (delay <= 0) {
      // Token already expired or about to expire — refresh immediately
      refreshToken()
        .then(() => {
          console.log('[Auth] Proactive refresh: token renewed')
          scheduleTokenRefresh() // schedule next refresh
        })
        .catch((err) => {
          console.warn('[Auth] Proactive refresh failed:', err)
        })
      return
    }

    console.log(`[Auth] Next token refresh in ${Math.round(delay / 1000)}s`)
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshToken()
        console.log('[Auth] Proactive refresh: token renewed')
        scheduleTokenRefresh() // schedule next refresh with new token
      } catch (err) {
        console.warn('[Auth] Proactive refresh failed:', err)
      }
    }, delay)
  }, [])

  // Refresh token when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && authStatus === 'authenticated') {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const exp = parseJwtExp(token)
        if (!exp) return

        const remaining = exp * 1000 - Date.now()
        // If less than 2 min remaining or already expired, refresh now
        if (remaining < REFRESH_BEFORE_MS) {
          console.log('[Auth] Tab focused — token expiring soon, refreshing')
          refreshToken()
            .then(() => scheduleTokenRefresh())
            .catch((err) => console.warn('[Auth] Focus refresh failed:', err))
        } else {
          // Reschedule timer (it may have drifted while tab was hidden)
          scheduleTokenRefresh()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [authStatus, scheduleTokenRefresh])

  // Clear refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Set status to loading during check
    setAuthStatus('loading')
    
    const token = localStorage.getItem('access_token')
    
    if (!token) {
      setUser(null)
      setAuthStatus('unauthenticated')
      return
    }

    try {
      // Verify token is valid by calling GET /auth/me
      const userData = await getCurrentUser()
      
      // On 200 → authenticated
      setUser(userData)
      setAuthStatus('authenticated')
      const wasUnavailable = isBackendUnavailable
      setIsBackendUnavailable(false) // Backend is available
      
      // Show success toast if backend was previously unavailable
      if (wasUnavailable) {
        toast.success('Соединение восстановлено', {
          description: 'Сервер снова доступен.',
          duration: 3000,
        })
        toastShownRef.current = false
      }
      
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(userData))
      // Notify other components about user change
      window.dispatchEvent(new Event('user-changed'))
      // Start proactive token refresh timer
      scheduleTokenRefresh()
    } catch (error) {
      // Distinguish between auth failures and network errors
      if (error instanceof NetworkError) {
        // Network error - backend unavailable
        console.warn('Auth check: Backend unavailable')
        setIsBackendUnavailable(true)
        
        // Try to restore user from localStorage if we have both token and stored user
        // This allows preserving auth state when backend is temporarily unavailable
        const storedUser = localStorage.getItem('user')
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            // Only preserve auth state if we have valid user data
            if (parsedUser && parsedUser.id) {
              setUser(parsedUser)
              setAuthStatus('authenticated')
              return // Don't clear tokens on network error - optimistic auth
            }
          } catch {
            // Invalid stored user, fall through to unauthenticated
          }
        }
        
        // No valid stored user data - user is not authenticated
        // Redirect to login even if backend is unavailable
        setUser(null)
        setAuthStatus('unauthenticated')
        // Clear potentially invalid tokens
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        // Show error toast and redirect will happen via useEffect
        if (location.pathname !== '/login') {
          toast.error('Требуется авторизация', {
            description: 'Не удается подключиться к серверу. Пожалуйста, войдите в систему.',
            duration: 4000,
          })
        }
        return
      }
      
      // On 401 → unauthenticated (real auth failure)
      if (error instanceof UnauthorizedError || (error instanceof Error && error.message === 'UNAUTHORIZED')) {
        console.warn('Auth check: Unauthorized (401) - clearing auth state')
        setUser(null)
        setAuthStatus('unauthenticated')
        setIsBackendUnavailable(false)
        
        // Clear tokens only on real auth failure
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        localStorage.removeItem('user_id')
        localStorage.removeItem('userId')
      } else {
        // Other errors - treat as network error
        console.warn('Auth check: Network error')
        setIsBackendUnavailable(true)
        
        // Try to preserve auth state only if we have valid stored user
        const storedUser = localStorage.getItem('user')
        if (storedUser && token) {
          try {
            const parsedUser = JSON.parse(storedUser)
            // Only preserve auth state if we have valid user data
            if (parsedUser && parsedUser.id) {
              setUser(parsedUser)
              setAuthStatus('authenticated')
            } else {
              // Invalid user data - not authenticated
              setUser(null)
              setAuthStatus('unauthenticated')
              localStorage.removeItem('access_token')
              localStorage.removeItem('refresh_token')
              localStorage.removeItem('user')
            }
          } catch {
            // Invalid stored user - not authenticated
            setUser(null)
            setAuthStatus('unauthenticated')
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
          }
        } else {
          // No stored user or token - not authenticated
          setUser(null)
          setAuthStatus('unauthenticated')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
        }
      }
    }
  }

  const login = useCallback((userData: User, token: string) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    if (userData.id) {
      localStorage.setItem('user_id', userData.id)
      localStorage.setItem('userId', userData.id)
    }
    setUser(userData)
    setAuthStatus('authenticated')
    // Notify other components about user change
    window.dispatchEvent(new Event('user-changed'))
    // Start proactive token refresh timer
    scheduleTokenRefresh()
  }, [scheduleTokenRefresh])

  const logout = useCallback(async () => {
    // Idempotent guard: prevent multiple simultaneous logout calls
    if (isLoggingOutRef.current) {
      console.warn('Logout already in progress, skipping duplicate call')
      return
    }

    isLoggingOutRef.current = true

    // Clear proactive refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    try {
      // Only call logout API if we have a token (avoid unnecessary calls)
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          await logoutApi()
        } catch (error) {
          console.warn('Logout API call failed:', error)
          // Continue with local cleanup even if API call fails
        }
      }
    } finally {
      // Always clear local state regardless of API call result
      setUser(null)
      setAuthStatus('unauthenticated')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('user_id')
      localStorage.removeItem('userId')
      // Notify other components about user change
      window.dispatchEvent(new Event('user-changed'))

      // Clear React Query cache
      queryClient.clear()
      
      // Only redirect if not already on login page
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
      
      // Reset guard after a short delay to allow navigation to complete
      setTimeout(() => {
        isLoggingOutRef.current = false
      }, 100)
    }
  }, [navigate, queryClient, location.pathname])

  const refreshAuth = useCallback(async () => {
    await checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isLoading: authStatus === 'loading',
    isAuthenticated: authStatus === 'authenticated',
    authStatus,
    isBackendUnavailable,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

