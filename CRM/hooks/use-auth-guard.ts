import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook to protect routes that require authentication
 * Automatically redirects to login if no valid token is found
 */
export function useAuthGuard() {
  const router = useRouter()

  useEffect(() => {
    // Check if running on client side
    if (typeof window === 'undefined') {
      return
    }

    const token = localStorage.getItem('access_token')
    
    if (!token) {
      console.warn('useAuthGuard: No access token found - redirecting to login')
      router.push('/login')
      return
    }

    // Optional: Add token expiration check here if your tokens have exp claims
    // For now, we rely on 401 responses from the API
  }, [router])
}




