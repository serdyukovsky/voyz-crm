# E2E Authentication Tests - Summary

## Overview
Comprehensive end-to-end tests for authentication behavior using Playwright. Tests focus on observable behavior rather than implementation details.

## Test Framework Setup

### Installed Dependencies
- `@playwright/test` - Playwright testing framework
- `playwright` - Playwright browser automation
- `jsonwebtoken` - JWT token creation for testing
- `@types/jsonwebtoken` - TypeScript types

### Configuration
- **Config file**: `CRM/playwright.config.ts`
- **Test directory**: `CRM/e2e/`
- **Base URL**: `http://localhost:3000` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)
- **Browser**: Chromium (default)

## Test Cases

### ✅ 1. Access protected route without token → redirect to /login
**File**: `e2e/auth.spec.ts` - Test: "Access protected route without token → redirect to /login"

**Behavior tested**:
- User tries to access protected route (e.g., `/`) without authentication
- System redirects to `/login`
- URL contains `/login`

**Observable assertions**:
- Page URL contains `/login`
- User is not on protected route

---

### ✅ 2. Login → access protected route successfully
**File**: `e2e/auth.spec.ts` - Test: "Login → access protected route successfully"

**Behavior tested**:
- User has valid authentication token
- User can access protected routes
- User is not redirected to login

**Observable assertions**:
- Page URL does not contain `/login`
- Page content loads successfully
- User remains on protected route

---

### ✅ 3. Reload page with valid token → user stays authenticated
**File**: `e2e/auth.spec.ts` - Test: "Reload page with valid token → user stays authenticated"

**Behavior tested**:
- User has valid token in localStorage
- User reloads the page
- Authentication persists across reload

**Observable assertions**:
- After reload, user is still authenticated
- No redirect to `/login`
- Token remains in localStorage

---

### ✅ 4. Reload page with expired token → redirect to /login
**File**: `e2e/auth.spec.ts` - Test: "Reload page with expired token → redirect to /login"

**Behavior tested**:
- User has expired token in localStorage
- User tries to access protected route
- System detects expired token and redirects

**Observable assertions**:
- User is redirected to `/login`
- Token is cleared from localStorage
- User cannot access protected content

---

### ✅ 5. API request returns 401 → user is logged out and redirected
**File**: `e2e/auth.spec.ts` - Test: "API request returns 401 → user is logged out and redirected"

**Behavior tested**:
- User makes API request with expired/invalid token
- Backend returns 401
- Frontend automatically logs out user

**Observable assertions**:
- User is redirected to `/login`
- Token is cleared from localStorage
- User cannot make further API calls

---

### ✅ 6. After logout: Token is removed
**File**: `e2e/auth.spec.ts` - Test: "After logout: Token is removed"

**Behavior tested**:
- User logs out (or auth is cleared)
- All authentication data is removed

**Observable assertions**:
- `access_token` removed from localStorage
- `user` data removed from localStorage
- All auth-related keys cleared

---

### ✅ 6b. After logout: Protected routes are inaccessible
**File**: `e2e/auth.spec.ts` - Test: "After logout: Protected routes are inaccessible"

**Behavior tested**:
- User logs out
- User tries to access protected routes
- All protected routes redirect to login

**Observable assertions**:
- Accessing `/` redirects to `/login`
- Accessing `/contacts` redirects to `/login`
- All protected routes are blocked

---

### ✅ 6c. After logout: API calls fail with 401
**File**: `e2e/auth.spec.ts` - Test: "After logout: API calls fail with 401"

**Behavior tested**:
- User logs out
- User tries to make API calls
- All API calls return 401

**Observable assertions**:
- API responses have status 401
- No successful API calls after logout
- System properly rejects unauthorized requests

---

### Additional Tests

#### Auth status flow tests
- **Loading → Authenticated**: Valid token results in authenticated state
- **Loading → Unauthenticated (no token)**: No token results in unauthenticated state
- **Loading → Unauthenticated (expired token)**: Expired token results in unauthenticated state

## Test Utilities

### `e2e/utils/auth-helpers.ts`
JWT token creation utilities:

- **`createValidToken(user, expiresIn)`**
  - Creates a valid JWT token
  - Default expiration: 15 minutes (matches backend config)
  - Uses same secret as backend

- **`createExpiredToken(user)`**
  - Creates an expired JWT token
  - Expired 60 seconds ago
  - Used for testing expiration handling

- **`createTokenExpiringIn(user, seconds)`**
  - Creates a token expiring in N seconds
  - Useful for testing time-based scenarios

### `e2e/utils/test-helpers.ts`
Test helper functions:

- **`clearAuthStorage(page)`** - Clears all auth localStorage
- **`setAuthToken(page, token)`** - Sets token in localStorage
- **`setUserData(page, user)`** - Sets user data in localStorage
- **`waitForLoginRedirect(page)`** - Waits for redirect to login
- **`waitForProtectedRoute(page, path)`** - Waits for navigation to route
- **`isOnLoginPage(page)`** - Checks if on login page
- **`loginViaUI(page, email, password)`** - Performs UI login
- **`waitForApiResponse(page, pattern, status)`** - Waits for API response

## Running Tests

### Basic Commands
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Prerequisites
1. **Backend running** on `http://localhost:3001` (or configured API URL)
2. **Frontend running** on `http://localhost:3000`
3. **Test user exists** in database (or adjust test user in `auth-helpers.ts`)

### Environment Variables
- `PLAYWRIGHT_TEST_BASE_URL` - Frontend URL (default: `http://localhost:3000`)
- `CI` - Set to `true` in CI (affects retries and parallelization)

## JWT Configuration

### Token Expiration
- **Default**: 15 minutes (matches backend `ACCESS_TOKEN_EXPIRES_IN`)
- **Test tokens**: Can be customized per test scenario

### JWT Secret
- **Location**: `e2e/utils/auth-helpers.ts`
- **Must match**: Backend `JWT_ACCESS_SECRET` in `.env`
- **Current**: `"your-super-secret-jwt-access-key-change-in-production"`

⚠️ **Important**: Update the JWT secret in `auth-helpers.ts` if your backend uses a different secret.

## Test Structure

```
e2e/
├── auth.spec.ts           # Main authentication test suite
├── utils/
│   ├── auth-helpers.ts    # JWT token utilities
│   └── test-helpers.ts    # General test utilities
└── README.md              # Test documentation
```

## Test Isolation

- Each test clears auth state before running (`beforeEach` hook)
- Tests are independent and can run in any order
- No shared state between tests

## Realistic Testing

- Uses actual JWT tokens with proper expiration
- Tests real API interactions
- Verifies observable behavior (URLs, redirects, storage)
- Does not depend on implementation details

## Files Created

1. `CRM/playwright.config.ts` - Playwright configuration
2. `CRM/e2e/auth.spec.ts` - Main test suite
3. `CRM/e2e/utils/auth-helpers.ts` - JWT utilities
4. `CRM/e2e/utils/test-helpers.ts` - Test helpers
5. `CRM/e2e/README.md` - Test documentation
6. Updated `CRM/package.json` - Added test scripts

## Next Steps

1. **Update JWT secret** in `e2e/utils/auth-helpers.ts` to match your backend
2. **Create test user** in database or update test user credentials
3. **Run tests** to verify authentication flow
4. **Adjust selectors** in tests if your UI structure differs
5. **Add more tests** for edge cases as needed

## Notes

- Tests use realistic JWT expiration (15 minutes)
- Tests focus on observable behavior, not implementation
- Some tests may require backend to be running
- Tests are designed to be maintainable and readable


