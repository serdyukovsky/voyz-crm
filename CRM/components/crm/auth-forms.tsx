"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { login } from "@/lib/api/auth"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useAuth } from '@/contexts/auth-context'

export function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setAuth, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log('Attempting login with:', email)
      const response = await login({ email, password })
      console.log('Login successful:', response)
      
      // Use auth context to set user and token
      setAuth(response.user, response.access_token)
      
      // Also save refresh token if provided
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token)
      }
      
      // Redirect to home page or previous location
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err instanceof Error ? err.message : t('auth.loginFailed')
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card shadow-none">
      <CardHeader className="space-y-1 pt-6 pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">{t('auth.signIn')}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t('auth.enterCredentials')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              {t('auth.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                {t('auth.password')}
              </Label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">
                {t('auth.forgotPassword')}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t('auth.noAccount')}{" "}
            <a href="/register" className="text-primary hover:underline">
              {t('auth.createAccount')}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export function SignupForm() {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError(t('auth.fillAllFields'))
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError(t('auth.passwordMinLength'))
      setIsLoading(false)
      return
    }

    // Simulate API call
    setTimeout(() => {
      setError(t('auth.emailAlreadyExists'))
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card shadow-none">
      <CardHeader className="space-y-1 pt-6 pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">{t('auth.createAccount')}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t('auth.getStarted')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              {t('auth.fullName')}
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={t('auth.fullNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-xs font-medium text-foreground">
              {t('auth.email')}
            </Label>
            <Input
              id="signup-email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-xs font-medium text-foreground">
              {t('auth.password')}
            </Label>
            <Input
              id="signup-password"
              type="password"
              placeholder={t('auth.passwordMinPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">
              {t('auth.confirmPassword')}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder={t('auth.reenterPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t('auth.haveAccount')}{" "}
            <a href="/app/login" className="text-primary hover:underline">
              {t('auth.signIn')}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export const RegisterForm = SignupForm
