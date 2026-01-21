import { Page } from '@playwright/test'

/**
 * Clear all authentication-related localStorage items
 */
export async function clearAuthStorage(page: Page): Promise<void> {
  if (!page.url().startsWith('http')) {
    await page.goto('/login')
  }
  await page.evaluate(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_id')
    localStorage.removeItem('userId')
  })
}

/**
 * Set authentication token in localStorage
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  if (!page.url().startsWith('http')) {
    await page.goto('/login')
  }
  await page.evaluate((token) => {
    localStorage.setItem('access_token', token)
  }, token)
}

/**
 * Set user data in localStorage
 */
export async function setUserData(
  page: Page,
  user: { id: string; email: string; firstName: string; lastName: string; role: string }
): Promise<void> {
  if (!page.url().startsWith('http')) {
    await page.goto('/login')
  }
  await page.evaluate((user) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('user_id', user.id)
    localStorage.setItem('userId', user.id)
  }, user)
}

/**
 * Get current URL path
 */
export async function getCurrentPath(page: Page): Promise<string> {
  return page.url().replace(page.url().split('/').slice(0, 3).join('/'), '') || '/'
}

/**
 * Wait for navigation to login page
 */
export async function waitForLoginRedirect(page: Page): Promise<void> {
  await page.waitForURL('**/login', { timeout: 5000 })
}

/**
 * Wait for navigation to a protected route
 */
export async function waitForProtectedRoute(page: Page, path: string = '/'): Promise<void> {
  await page.waitForURL(`**${path}`, { timeout: 5000 })
}

/**
 * Check if user is on login page
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url()
  return url.includes('/login')
}

/**
 * Perform login via UI
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to login page
  await page.goto('/login')
  
  // Fill in email
  await page.fill('input[type="email"]', email)
  
  // Fill in password
  await page.fill('input[type="password"]', password)
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for navigation after login
  await page.waitForURL('**/', { timeout: 5000 })
}

/**
 * Wait for API request to complete and check response status
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus?: number
): Promise<void> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url()
      const matches = typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url)
      if (!matches) return false
      if (expectedStatus !== undefined) {
        return response.status() === expectedStatus
      }
      return true
    },
    { timeout: 10000 }
  )
  
  if (expectedStatus !== undefined && response.status() !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status()} for ${response.url()}`
    )
  }
}


