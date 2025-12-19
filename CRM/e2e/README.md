# E2E Authentication Tests

This directory contains end-to-end tests for authentication behavior using Playwright.

## Prerequisites

1. **Backend must be running** on the configured API URL (default: `http://localhost:3001`)
2. **Frontend must be running** on `http://localhost:3000` (or set `PLAYWRIGHT_TEST_BASE_URL` env var)
3. **Test user must exist** in the database (or tests will need to be adjusted)

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Cases

### 1. Access protected route without token → redirect to /login
- Verifies that unauthenticated users are redirected to login
- Tests ProtectedRoute component behavior

### 2. Login → access protected route successfully
- Verifies successful authentication flow
- Tests that authenticated users can access protected routes

### 3. Reload page with valid token → user stays authenticated
- Verifies that valid tokens persist across page reloads
- Tests auth state persistence

### 4. Reload page with expired token → redirect to /login
- Verifies that expired tokens trigger logout
- Tests token expiration handling

### 5. API request returns 401 → user is logged out and redirected
- Verifies that 401 responses trigger automatic logout
- Tests API interceptor behavior

### 6. After logout:
- **6a**: Token is removed from storage
- **6b**: Protected routes are inaccessible
- **6c**: API calls fail with 401

## Test Utilities

### `e2e/utils/auth-helpers.ts`
- `createValidToken()` - Creates a valid JWT token
- `createExpiredToken()` - Creates an expired JWT token
- `createTokenExpiringIn()` - Creates a token expiring in N seconds

### `e2e/utils/test-helpers.ts`
- `clearAuthStorage()` - Clears all auth-related localStorage
- `setAuthToken()` - Sets token in localStorage
- `setUserData()` - Sets user data in localStorage
- `waitForLoginRedirect()` - Waits for redirect to login page
- `loginViaUI()` - Performs login via UI interaction

## Configuration

### JWT Secret
The tests use the same JWT secret as the backend (`JWT_ACCESS_SECRET`). 
Make sure the secret in `e2e/utils/auth-helpers.ts` matches your backend configuration.

### Test User
Default test user is defined in `e2e/utils/auth-helpers.ts`:
```typescript
{
  id: 'test-user-id-123',
  email: 'test@example.com',
  role: 'ADMIN',
}
```

You may need to:
1. Create this user in your test database, or
2. Update the test user to match an existing user

## Environment Variables

- `PLAYWRIGHT_TEST_BASE_URL` - Base URL for frontend (default: `http://localhost:3000`)
- `CI` - Set to `true` in CI environments (affects retries and workers)

## Notes

- Tests use realistic JWT expiration (15 minutes as per backend config)
- Tests focus on observable behavior, not implementation details
- Tests are isolated and clear auth state before each test
- Some tests may require backend to be running and accessible


