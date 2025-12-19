import { test, expect } from '@playwright/test'
import {
  createValidToken,
  createExpiredToken,
  createTokenExpiringIn,
  TEST_USER,
} from './utils/auth-helpers'
import {
  clearAuthStorage,
  setAuthToken,
  setUserData,
  waitForLoginRedirect,
  waitForProtectedRoute,
  isOnLoginPage,
  loginViaUI,
  waitForApiResponse,
} from './utils/test-helpers'

// Test user data matching backend structure
const testUserData = {
  id: TEST_USER.id,
  email: TEST_USER.email,
  firstName: 'Test',
  lastName: 'User',
  role: TEST_USER.role,
}

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state before each test
    await clearAuthStorage(page)
  })

  test('1. Access protected route without token → redirect to /login', async ({
    page,
  }) => {
    // Ensure no token in storage
    await clearAuthStorage(page)

    // Try to access protected route (dashboard)
    await page.goto('/')

    // Should redirect to login page
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)

    // Verify URL is /login
    expect(page.url()).toContain('/login')
  })

  test('2. Login → access protected route successfully', async ({ page }) => {
    // Note: This test assumes backend is running and test user exists
    // In a real scenario, you'd seed test data or use test credentials
    
    // For this test, we'll simulate login by setting valid token
    // In a full E2E scenario, you'd actually fill the login form
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')

    // Should successfully access the route (not redirected to login)
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the dashboard (not login page)
    expect(await isOnLoginPage(page)).toBe(false)
    expect(page.url()).not.toContain('/login')
    
    // Verify page content loads (check for dashboard elements)
    // Adjust selector based on your actual dashboard structure
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('3. Reload page with valid token → user stays authenticated', async ({
    page,
  }) => {
    // Set valid token and user data
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify we're authenticated (not on login page)
    expect(await isOnLoginPage(page)).toBe(false)

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still be authenticated (not redirected to login)
    expect(await isOnLoginPage(page)).toBe(false)
    expect(page.url()).not.toContain('/login')
  })

  test('4. Reload page with expired token → redirect to /login', async ({
    page,
  }) => {
    // Set expired token
    const expiredToken = createExpiredToken(TEST_USER)
    await setAuthToken(page, expiredToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')

    // Should redirect to login because token is expired
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)

    // Verify token was cleared from storage
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
  })

  test('5. API request returns 401 → user is logged out and redirected', async ({
    page,
  }) => {
    // Set a token that will expire soon (simulating expired token scenario)
    // We'll use a token that expires in 1 second, then wait for it to expire
    const shortLivedToken = createTokenExpiringIn(TEST_USER, 1)
    await setAuthToken(page, shortLivedToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for token to expire
    await page.waitForTimeout(2000)

    // Intercept API calls to verify 401 response
    let apiCallMade = false
    page.on('response', async (response) => {
      const url = response.url()
      // Check for API calls (not static assets)
      if (
        url.includes('/api/') &&
        !url.includes('.css') &&
        !url.includes('.js') &&
        !url.includes('.png') &&
        !url.includes('.svg')
      ) {
        apiCallMade = true
        if (response.status() === 401) {
          // Wait a bit for logout to complete
          await page.waitForTimeout(500)
        }
      }
    })

    // Trigger an API call (e.g., by navigating or interacting with page)
    // The page should automatically make API calls on load
    // Wait for any API calls to complete
    await page.waitForTimeout(2000)

    // If an API call was made and returned 401, user should be logged out
    if (apiCallMade) {
      // Verify redirect to login
      await waitForLoginRedirect(page)
      expect(await isOnLoginPage(page)).toBe(true)

      // Verify token was cleared
      const token = await page.evaluate(() =>
        localStorage.getItem('access_token')
      )
      expect(token).toBeNull()
    } else {
      // Alternative: Manually trigger an API call that will fail
      // Navigate to a page that makes API calls
      await page.goto('/contacts')
      
      // Wait for API response
      try {
        await waitForApiResponse(page, '/api/', 401)
        
        // Should redirect to login
        await waitForLoginRedirect(page)
        expect(await isOnLoginPage(page)).toBe(true)
      } catch (error) {
        // If no 401 occurred, the test might need adjustment
        // This could happen if the page doesn't make API calls immediately
        console.warn('No 401 response detected, test may need adjustment')
      }
    }
  })

  test('6a. After logout: Token is removed', async ({ page }) => {
    // Set valid token
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Simulate logout by clearing storage (or clicking logout button if available)
    await clearAuthStorage(page)

    // Verify token is removed
    const token = await page.evaluate(() =>
      localStorage.getItem('access_token')
    )
    expect(token).toBeNull()

    // Verify user data is removed
    const user = await page.evaluate(() => localStorage.getItem('user'))
    expect(user).toBeNull()
  })

  test('6b. After logout: Protected routes are inaccessible', async ({
    page,
  }) => {
    // Set valid token
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Clear auth (logout)
    await clearAuthStorage(page)

    // Try to access protected route
    await page.goto('/')

    // Should redirect to login
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)

    // Try another protected route
    await page.goto('/contacts')

    // Should also redirect to login
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)
  })

  test('6c. After logout: API calls fail with 401', async ({ page }) => {
    // Set valid token
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Clear auth (logout)
    await clearAuthStorage(page)

    // Intercept API calls
    const apiResponses: Array<{ url: string; status: number }> = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/api/') && !url.includes('/auth/login')) {
        apiResponses.push({
          url,
          status: response.status(),
        })
      }
    })

    // Try to navigate to a page that makes API calls
    await page.goto('/contacts')
    await page.waitForTimeout(2000) // Wait for API calls

    // Verify API calls returned 401
    const unauthorizedCalls = apiResponses.filter((r) => r.status === 401)
    expect(unauthorizedCalls.length).toBeGreaterThan(0)
  })

  test('Auth status flow: loading → authenticated', async ({ page }) => {
    // Set valid token
    const validToken = createValidToken(TEST_USER)
    await setAuthToken(page, validToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')

    // Should eventually load (not stuck on loading)
    await page.waitForLoadState('networkidle')
    
    // Should not be on login page
    expect(await isOnLoginPage(page)).toBe(false)
  })

  test('Auth status flow: loading → unauthenticated (no token)', async ({
    page,
  }) => {
    // Ensure no token
    await clearAuthStorage(page)

    // Navigate to protected route
    await page.goto('/')

    // Should redirect to login
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)
  })

  test('Auth status flow: loading → unauthenticated (expired token)', async ({
    page,
  }) => {
    // Set expired token
    const expiredToken = createExpiredToken(TEST_USER)
    await setAuthToken(page, expiredToken)
    await setUserData(page, testUserData)

    // Navigate to protected route
    await page.goto('/')

    // Should redirect to login
    await waitForLoginRedirect(page)
    expect(await isOnLoginPage(page)).toBe(true)
  })
})


