# Frontend Auth Error Handling - Hardening

## Overview

Improved authentication error handling to distinguish between real authentication failures and infrastructure issues. The frontend now only logs out users on HTTP 401 (authentication failure), not on network errors.

## Changes

### 1. API Interceptor (`lib/api/api-client.ts`)

**Before:**
- Network errors could trigger logout
- No distinction between auth failures and infrastructure issues

**After:**
- ✅ **Logout ONLY on HTTP 401** (real auth failure)
- ✅ **Network errors do NOT trigger logout** (infrastructure issue)
- ✅ Added `NetworkError` class for network-related errors
- ✅ Added `setGlobalBackendUnavailableHandler` for backend status tracking

**Key Changes:**
```typescript
// Network errors throw NetworkError (does NOT trigger logout)
if (error instanceof TypeError && error.message === 'Failed to fetch') {
  throw new NetworkError('Cannot connect to server...')
}

// Only HTTP 401 triggers logout
if (response.status === 401) {
  // Clear tokens and trigger logout
}
```

### 2. Auth Context (`contexts/auth-context.tsx`)

**Added:**
- ✅ `isBackendUnavailable` state
- ✅ Backend unavailable handler registration
- ✅ Auth state preservation on network errors

**Behavior:**
- **Network Error**: Preserves auth state, sets `isBackendUnavailable = true`
- **HTTP 401**: Clears auth state, sets `isBackendUnavailable = false`
- **On recovery**: Automatically detects when backend is available again

**Key Logic:**
```typescript
if (error instanceof NetworkError) {
  // Preserve auth state - don't clear tokens
  setIsBackendUnavailable(true)
  // Try to restore user from localStorage
  // Keep authenticated state if token exists
} else if (error instanceof UnauthorizedError) {
  // Real auth failure - clear everything
  setAuthStatus('unauthenticated')
  // Clear all tokens
}
```

### 3. Backend Unavailable Banner (`components/backend/backend-unavailable-banner.tsx`)

**New Component:**
- ✅ Non-intrusive banner showing backend is unavailable
- ✅ "Retry" button to manually check backend status
- ✅ Only shows when `isBackendUnavailable === true`
- ✅ Automatically hides when backend becomes available

**Features:**
- Orange/warning styling (not red/error)
- Clear message: "Cannot connect to backend server"
- Reassuring: "Your authentication state is preserved"
- Action button: "Retry" to check backend status

### 4. App Integration (`src/App.tsx`)

**Added:**
- ✅ `<BackendUnavailableBanner />` component at top of routes
- ✅ Shows on all pages when backend is unavailable

## Behavior Matrix

| Error Type | HTTP Status | Logout? | Clear Tokens? | Show Banner? | Preserve Auth State? |
|------------|-------------|---------|---------------|--------------|---------------------|
| Network Error | N/A | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| Connection Refused | N/A | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| Timeout | N/A | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| HTTP 401 | 401 | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| HTTP 403 | 403 | ❌ No | ❌ No | ❌ No | ✅ Yes |
| HTTP 500+ | 500+ | ❌ No | ❌ No | ❌ No | ✅ Yes |

## User Experience

### Scenario 1: Backend Temporarily Down

1. User is authenticated and using the app
2. Backend goes down (network error)
3. **Result:**
   - ✅ User stays authenticated
   - ✅ Banner appears: "Backend Unavailable"
   - ✅ User can continue viewing cached data
   - ✅ When backend recovers, banner disappears automatically

### Scenario 2: Token Expired

1. User is authenticated
2. Token expires (HTTP 401)
3. **Result:**
   - ✅ User is logged out
   - ✅ Tokens are cleared
   - ✅ Redirected to `/login`
   - ✅ No banner (this is expected behavior)

### Scenario 3: Backend Recovery

1. Backend was down, user saw banner
2. Backend comes back online
3. **Result:**
   - ✅ Next API call succeeds
   - ✅ Banner automatically disappears
   - ✅ `isBackendUnavailable` set to `false`
   - ✅ User continues working seamlessly

## Testing

### Test Network Error Handling

```typescript
// Simulate network error
// 1. Stop backend server
// 2. Try to make API call
// Expected: Banner appears, user stays authenticated

// Simulate token expiration
// 1. Use expired token
// 2. Make API call
// Expected: User logged out, redirected to /login
```

### Test Backend Recovery

```typescript
// 1. Stop backend (banner appears)
// 2. Start backend
// 3. Make API call
// Expected: Banner disappears, normal operation resumes
```

## Benefits

1. **Better UX**: Users don't get logged out due to temporary network issues
2. **Clear Feedback**: Banner clearly indicates backend status
3. **Resilient**: App continues working (with cached data) during outages
4. **Automatic Recovery**: Detects when backend comes back online
5. **Security**: Still properly logs out on real auth failures (401)

## Files Changed

- `CRM/lib/api/api-client.ts` - Network error handling
- `CRM/contexts/auth-context.tsx` - Backend unavailable state
- `CRM/lib/api/auth.ts` - NetworkError propagation
- `CRM/components/backend/backend-unavailable-banner.tsx` - New component
- `CRM/src/App.tsx` - Banner integration

## Migration Notes

No breaking changes. Existing code continues to work. The new behavior is:
- More resilient to network issues
- Better user experience
- Clearer error messaging


