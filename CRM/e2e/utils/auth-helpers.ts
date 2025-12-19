import jwt from 'jsonwebtoken'

/**
 * JWT secret used in backend (from .env)
 * In production, this should be a strong secret
 */
const JWT_SECRET = 'your-super-secret-jwt-access-key-change-in-production'

export interface TestUser {
  id: string
  email: string
  role: string
}

/**
 * Create a valid JWT token for testing
 * @param user - User data to encode in token
 * @param expiresIn - Token expiration time (default: 15m as per backend config)
 * @returns JWT token string
 */
export function createValidToken(
  user: TestUser,
  expiresIn: string = '15m'
): string {
  const payload = {
    email: user.email,
    sub: user.id,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  })
}

/**
 * Create an expired JWT token for testing
 * @param user - User data to encode in token
 * @returns Expired JWT token string
 */
export function createExpiredToken(user: TestUser): string {
  const payload = {
    email: user.email,
    sub: user.id,
    role: user.role,
    // Set expiration to past date
    exp: Math.floor(Date.now() / 1000) - 60, // Expired 60 seconds ago
  }

  return jwt.sign(payload, JWT_SECRET)
}

/**
 * Create a JWT token that expires in a specific number of seconds
 * @param user - User data to encode in token
 * @param secondsUntilExpiry - Seconds until token expires
 * @returns JWT token string
 */
export function createTokenExpiringIn(
  user: TestUser,
  secondsUntilExpiry: number
): string {
  const payload = {
    email: user.email,
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + secondsUntilExpiry,
  }

  return jwt.sign(payload, JWT_SECRET)
}

/**
 * Default test user for E2E tests
 */
export const TEST_USER: TestUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  role: 'ADMIN',
}


