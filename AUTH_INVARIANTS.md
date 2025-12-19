# Authentication Invariants

**Enforceable rules that MUST be maintained for correct authentication behavior.**

## Auth State Machine

```
┌──────────┐
│ loading  │ ← Initial state on app startup
└────┬─────┘
     │
     ├─ GET /auth/me → 200 ──┐
     │                        │
     │                        ▼
     │                 ┌──────────────┐
     │                 │authenticated │
     │                 └──────┬───────┘
     │                        │
     │                        │ Any 401 response
     │                        │ Logout action
     │                        │
     └─ GET /auth/me → 401 ───┴──┐
                                  │
                                  ▼
                           ┌──────────────┐
                           │unauthenticated│
                           └──────────────┘
```

### States

- **`loading`**: Auth check in progress (app startup, token verification)
- **`authenticated`**: Valid token confirmed via GET /auth/me
- **`unauthenticated`**: No token or invalid/expired token

### Transitions

1. **`loading` → `authenticated`**: GET /auth/me returns 200
2. **`loading` → `unauthenticated`**: GET /auth/me returns 401 OR no token exists
3. **`authenticated` → `unauthenticated`**: Any 401 response OR explicit logout
4. **`unauthenticated` → `authenticated`**: Successful login

## Single Source of Truth

**GET /auth/me** is the ONLY source of truth for authentication state.

### Rules

1. **On app startup**: MUST call GET /auth/me to verify token validity
2. **Never assume** token validity from localStorage alone
3. **Always verify** token via GET /auth/me before setting `authenticated` state
4. **Backend MUST** return:
   - `200` + user data if token is valid
   - `401` if token is expired/invalid/missing

## Core Rules

### Rule 1: Any 401 = Logout

**Invariant**: ANY 401 response MUST trigger immediate logout.

**Enforcement**:
- API interceptor catches ALL 401 responses
- Logout is idempotent (multiple 401s = single logout)
- Logout clears: tokens, user data, React Query cache
- Logout redirects to /login (if not already there)

**Violation**: If 401 does not trigger logout → BUG

### Rule 2: No Access Without Auth

**Invariant**: Protected routes MUST be inaccessible when `authStatus !== 'authenticated'`.

**Enforcement**:
- ProtectedRoute component blocks access
- `authStatus === 'loading'` → show loading skeleton
- `authStatus === 'unauthenticated'` → redirect to /login
- `authStatus === 'authenticated'` → render children

**Violation**: If unauthenticated user can access protected route → BUG

### Rule 3: No Refresh Tokens (MVP)

**Invariant**: JWT-only authentication. No refresh token mechanism.

**Enforcement**:
- Token expiration = logout
- No automatic token refresh
- User must re-login when token expires

**Violation**: If refresh tokens are introduced → violates MVP constraint

## Common Failure Scenarios

### Scenario 1: Expired Token on Page Load

**Setup**: User has expired token in localStorage, reloads page

**Expected Behavior**:
1. App starts with `authStatus = 'loading'`
2. GET /auth/me called with expired token
3. Backend returns 401
4. `authStatus = 'unauthenticated'`
5. Redirect to /login
6. Token cleared from localStorage

**Invariant**: Expired token MUST result in redirect to /login

---

### Scenario 2: Expired Token During API Call

**Setup**: User is authenticated, token expires, user makes API call

**Expected Behavior**:
1. API call made with expired token
2. Backend returns 401
3. API interceptor catches 401
4. Logout triggered (idempotent)
5. Redirect to /login
6. Token cleared

**Invariant**: 401 during API call MUST trigger logout

---

### Scenario 3: Multiple Simultaneous 401 Responses

**Setup**: Multiple API calls fail with 401 simultaneously

**Expected Behavior**:
1. First 401 triggers logout
2. Subsequent 401s are ignored (idempotent guard)
3. Single logout execution
4. Single redirect to /login

**Invariant**: Multiple 401s MUST result in single logout

---

### Scenario 4: Direct Navigation to Protected Route

**Setup**: User navigates directly to `/contacts` without authentication

**Expected Behavior**:
1. ProtectedRoute checks `authStatus`
2. If `loading` → show skeleton
3. If `unauthenticated` → redirect to /login
4. If `authenticated` → render content

**Invariant**: Unauthenticated access MUST redirect to /login

---

### Scenario 5: Token Removed During Session

**Setup**: User manually removes token from localStorage

**Expected Behavior**:
1. Next API call or navigation triggers auth check
2. GET /auth/me called (or attempted)
3. No token → immediate `unauthenticated` state
4. Redirect to /login

**Invariant**: Missing token MUST result in `unauthenticated` state

---

### Scenario 6: Backend Returns 401 for Valid Token

**Setup**: Backend rejects valid token (e.g., user deactivated)

**Expected Behavior**:
1. GET /auth/me returns 401
2. Frontend treats as invalid token
3. Logout triggered
4. Redirect to /login

**Invariant**: Backend 401 MUST be treated as logout signal

## Enforcement Checklist

### Frontend

- [ ] AuthContext uses GET /auth/me as single source of truth
- [ ] ProtectedRoute checks `authStatus` (not `isAuthenticated` boolean)
- [ ] API interceptor handles ALL 401 responses
- [ ] Logout is idempotent (guard prevents multiple executions)
- [ ] No refresh token logic exists
- [ ] All protected routes wrapped in ProtectedRoute

### Backend

- [ ] GET /auth/me returns 200 for valid tokens
- [ ] GET /auth/me returns 401 for invalid/expired tokens
- [ ] All protected routes use JwtAuthGuard
- [ ] JwtAuthGuard throws UnauthorizedException (401) on failure
- [ ] No silent failures (all auth failures return 401)

## Violation Detection

### Red Flags

1. **User can access protected route without token** → Rule 2 violation
2. **401 response does not trigger logout** → Rule 1 violation
3. **Token validity assumed without GET /auth/me** → Single source violation
4. **Multiple logouts from single 401** → Idempotency violation
5. **Refresh token logic exists** → Rule 3 violation

### Testing

All invariants MUST be verified by E2E tests:
- See `e2e/auth.spec.ts` for test coverage
- Run `npm run test:e2e` to verify invariants

## Summary

**Three Core Rules**:
1. **Any 401 = Logout** (enforced by API interceptor)
2. **No Access Without Auth** (enforced by ProtectedRoute)
3. **No Refresh Tokens** (MVP constraint)

**Single Source of Truth**: GET /auth/me

**State Machine**: `loading` → `authenticated` | `unauthenticated`

**Violations are bugs** and MUST be fixed immediately.


