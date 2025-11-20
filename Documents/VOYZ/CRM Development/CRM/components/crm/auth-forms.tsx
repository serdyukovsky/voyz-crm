"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    setTimeout(() => {
      router.push("/")
    }, 300)
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card shadow-none">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">Sign in</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                Password
              </Label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
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
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Create account
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export function SignupForm() {
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
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setIsLoading(false)
      return
    }

    // Simulate API call
    setTimeout(() => {
      setError("An account with this email already exists")
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card shadow-none">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">Create account</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Get started with your free account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-xs font-medium text-foreground">
              Email
            </Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-xs font-medium text-foreground">
              Password
            </Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter password"
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
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export const RegisterForm = SignupForm
