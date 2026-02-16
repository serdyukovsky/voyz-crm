"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
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
      const response = await login({ email, password })

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
      const errorMessage = err instanceof Error ? err.message : t('auth.loginFailed')
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-white tracking-tight">{t('auth.signIn')}</h1>
        <p className="mt-2 text-sm text-white/40">{t('auth.enterCredentials')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300/90">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-white/60">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-white/60">
              {t('auth.password')}
            </label>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? t('auth.signingIn') : t('auth.signIn')}
        </button>

        <p className="text-center text-sm text-white/30 pt-2">
          {t('auth.noAccount')}{" "}
          <a href="/app/register" className="text-white/70 hover:text-white transition-colors">
            {t('auth.createAccount')}
          </a>
        </p>
      </form>
    </div>
  )
}

export function SignupForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-white tracking-tight">{t('auth.createAccount')}</h1>
        <p className="mt-2 text-sm text-white/40">{t('auth.getStarted')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300/90">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-white/60">
            {t('auth.fullName')}
          </label>
          <input
            id="name"
            type="text"
            placeholder={t('auth.fullNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-sm font-medium text-white/60">
            {t('auth.email')}
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-sm font-medium text-white/60">
            {t('auth.password')}
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder={t('auth.passwordMinPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-white/60">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder={t('auth.reenterPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>

        <p className="text-center text-sm text-white/30 pt-2">
          {t('auth.haveAccount')}{" "}
          <a href="/app/login" className="text-white/70 hover:text-white transition-colors">
            {t('auth.signIn')}
          </a>
        </p>
      </form>
    </div>
  )
}

export const RegisterForm = SignupForm
