"use client"

import { toast as sonnerToast } from 'sonner'

export function useToastNotification() {
  const showSuccess = (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    })
  }

  const showError = (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    })
  }

  const showWarning = (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    })
  }

  const showInfo = (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}





