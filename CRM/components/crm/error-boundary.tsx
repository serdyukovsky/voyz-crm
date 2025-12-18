'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-destructive mb-2">
                  Something went wrong
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      this.setState({ hasError: false, error: null })
                      window.location.reload()
                    }}
                  >
                    Reload Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      this.setState({ hasError: false, error: null })
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

