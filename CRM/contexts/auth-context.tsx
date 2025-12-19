"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, logout as logoutApi, type User } from '@/lib/api/auth'
import { UnauthorizedError, NetworkError, setGlobalBackendUnavailableHandler } from '@/lib/api/api-client'

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
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Set up backend unavailable handler
  useEffect(() => {
    setGlobalBackendUnavailableHandler((isUnavailable: boolean) => {
      setIsBackendUnavailable(isUnavailable)
    })
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
      setIsBackendUnavailable(false) // Backend is available
      
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      // Distinguish between auth failures and network errors
      if (error instanceof NetworkError) {
        // Network error - backend unavailable
        // DO NOT clear auth state - user may still be authenticated
        // Keep current auth state if we have a token
        console.warn('Auth check: Backend unavailable, preserving auth state')
        setIsBackendUnavailable(true)
        
        // If we have a token, assume we're still authenticated (optimistic)
        // Auth state will be re-verified when backend comes back
        if (token) {
          // Try to restore user from localStorage
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser))
              setAuthStatus('authenticated')
              return // Don't clear tokens on network error
            } catch {
              // Invalid stored user, fall through
            }
          }
        }
        
        // No stored user, but don't clear tokens - backend may come back
        setAuthStatus('unauthenticated')
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
        console.warn('Auth check: Network error, preserving auth state')
        setIsBackendUnavailable(true)
        // Preserve auth state
        const storedUser = localStorage.getItem('user')
        if (storedUser && token) {
          try {
            setUser(JSON.parse(storedUser))
            setAuthStatus('authenticated')
          } catch {
            setAuthStatus('unauthenticated')
          }
        } else {
          setAuthStatus('unauthenticated')
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
  }, [])

  const logout = useCallback(async () => {
    // Idempotent guard: prevent multiple simultaneous logout calls
    if (isLoggingOutRef.current) {
      console.warn('Logout already in progress, skipping duplicate call')
      return
    }

    isLoggingOutRef.current = true

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

