/**
 * Complete Authentication Flow Test Script
 * 
 * This script tests the entire authentication system:
 * 1. Register admin (via seed)
 * 2. Login admin
 * 3. Create test user (as admin)
 * 4. Login user
 * 5. Refresh workflow
 * 6. Logout workflow
 * 7. Try revoked refresh token (should fail)
 */

import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';

interface AuthResponse {
  access_token: string;
  user?: any;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class AuthFlowTester {
  private client: AxiosInstance;
  private adminAccessToken: string | null = null;
  private userAccessToken: string | null = null;
  private userRefreshToken: string | null = null;
  private testUserId: string | null = null;
  private results: TestResult[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true, // Important for cookies
      validateStatus: () => true, // Don't throw on any status
    });
  }

  private log(message: string) {
    console.log(`\n${message}`);
  }

  private addResult(result: TestResult) {
    this.results.push(result);
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  }

  async test1_LoginAdmin(): Promise<boolean> {
    this.log('Test 1: Login as Admin');
    try {
      const response = await this.client.post<AuthResponse>('/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (response.status === 200 && response.data.access_token) {
        this.adminAccessToken = response.data.access_token;
        this.addResult({
          name: 'Login Admin',
          passed: true,
          details: {
            userId: response.data.user?.id,
            email: response.data.user?.email,
            role: response.data.user?.role,
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Login Admin',
          passed: false,
          error: `Unexpected status: ${response.status}`,
          details: response.data,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Login Admin',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test2_CreateTestUser(): Promise<boolean> {
    this.log('Test 2: Create Test User (as Admin)');
    if (!this.adminAccessToken) {
      this.addResult({
        name: 'Create Test User',
        passed: false,
        error: 'Admin access token not available',
      });
      return false;
    }

    try {
      const testUserEmail = `testuser_${Date.now()}@example.com`;
      const response = await this.client.post(
        '/auth/register',
        {
          email: testUserEmail,
          password: 'TestUser123!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'MANAGER',
        },
        {
          headers: {
            Authorization: `Bearer ${this.adminAccessToken}`,
          },
        },
      );

      if (response.status === 201 && response.data.user) {
        this.testUserId = response.data.user.id;
        this.addResult({
          name: 'Create Test User',
          passed: true,
          details: {
            userId: response.data.user.id,
            email: response.data.user.email,
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Create Test User',
          passed: false,
          error: `Unexpected status: ${response.status}`,
          details: response.data,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Create Test User',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test3_LoginUser(): Promise<boolean> {
    this.log('Test 3: Login as Test User');
    if (!this.testUserId) {
      this.addResult({
        name: 'Login User',
        passed: false,
        error: 'Test user not created',
      });
      return false;
    }

    try {
      // Extract email from test user creation
      const testUserEmail = `testuser_${this.testUserId.split('-')[0]}@example.com`;
      const response = await this.client.post<AuthResponse>('/auth/login', {
        email: testUserEmail,
        password: 'TestUser123!@#',
      });

      if (response.status === 200 && response.data.access_token) {
        this.userAccessToken = response.data.access_token;
        // Extract refresh token from Set-Cookie header
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          const refreshTokenCookie = cookies.find((c: string) =>
            c.startsWith('refreshToken='),
          );
          if (refreshTokenCookie) {
            this.userRefreshToken = refreshTokenCookie.split(';')[0].split('=')[1];
          }
        }
        this.addResult({
          name: 'Login User',
          passed: true,
          details: {
            userId: response.data.user?.id,
            hasRefreshToken: !!this.userRefreshToken,
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Login User',
          passed: false,
          error: `Unexpected status: ${response.status}`,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Login User',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test4_RefreshToken(): Promise<boolean> {
    this.log('Test 4: Refresh Access Token');
    if (!this.userAccessToken) {
      this.addResult({
        name: 'Refresh Token',
        passed: false,
        error: 'User access token not available',
      });
      return false;
    }

    try {
      const response = await this.client.post<AuthResponse>('/auth/refresh');

      if (response.status === 200 && response.data.access_token) {
        const oldToken = this.userAccessToken;
        this.userAccessToken = response.data.access_token;
        this.addResult({
          name: 'Refresh Token',
          passed: true,
          details: {
            tokenRotated: oldToken !== this.userAccessToken,
            newTokenLength: this.userAccessToken.length,
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Refresh Token',
          passed: false,
          error: `Unexpected status: ${response.status}`,
          details: response.data,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Refresh Token',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test5_UseRefreshedToken(): Promise<boolean> {
    this.log('Test 5: Use Refreshed Token to Access Protected Endpoint');
    if (!this.userAccessToken) {
      this.addResult({
        name: 'Use Refreshed Token',
        passed: false,
        error: 'User access token not available',
      });
      return false;
    }

    try {
      const response = await this.client.get('/users/me', {
        headers: {
          Authorization: `Bearer ${this.userAccessToken}`,
        },
      });

      if (response.status === 200) {
        this.addResult({
          name: 'Use Refreshed Token',
          passed: true,
          details: {
            userEmail: response.data.email,
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Use Refreshed Token',
          passed: false,
          error: `Unexpected status: ${response.status}`,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Use Refreshed Token',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test6_Logout(): Promise<boolean> {
    this.log('Test 6: Logout User');
    if (!this.userAccessToken) {
      this.addResult({
        name: 'Logout',
        passed: false,
        error: 'User access token not available',
      });
      return false;
    }

    try {
      const response = await this.client.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${this.userAccessToken}`,
          },
        },
      );

      if (response.status === 200) {
        this.addResult({
          name: 'Logout',
          passed: true,
        });
        return true;
      } else {
        this.addResult({
          name: 'Logout',
          passed: false,
          error: `Unexpected status: ${response.status}`,
        });
        return false;
      }
    } catch (error: any) {
      this.addResult({
        name: 'Logout',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async test7_RevokedTokenShouldFail(): Promise<boolean> {
    this.log('Test 7: Try to Use Revoked Refresh Token (Should Fail)');
    if (!this.userRefreshToken) {
      this.addResult({
        name: 'Revoked Token Test',
        passed: false,
        error: 'Refresh token not available',
      });
      return false;
    }

    try {
      // Try to refresh with the old token (should fail)
      const response = await this.client.post('/auth/refresh');

      if (response.status === 401) {
        this.addResult({
          name: 'Revoked Token Test',
          passed: true,
          details: {
            message: 'Correctly rejected revoked token',
          },
        });
        return true;
      } else {
        this.addResult({
          name: 'Revoked Token Test',
          passed: false,
          error: `Expected 401, got ${response.status}`,
          details: response.data,
        });
        return false;
      }
    } catch (error: any) {
      // If it throws, that's also acceptable
      if (error.response?.status === 401) {
        this.addResult({
          name: 'Revoked Token Test',
          passed: true,
          details: {
            message: 'Correctly rejected revoked token',
          },
        });
        return true;
      }
      this.addResult({
        name: 'Revoked Token Test',
        passed: false,
        error: error.message,
      });
      return false;
    }
  }

  async runAllTests() {
    console.log('\n🚀 Starting Authentication Flow Tests');
    console.log('=====================================\n');

    // Note: Admin registration is done via seed script
    // We assume admin already exists

    await this.test1_LoginAdmin();
    await this.test2_CreateTestUser();
    await this.test3_LoginUser();
    await this.test4_RefreshToken();
    await this.test5_UseRefreshedToken();
    await this.test6_Logout();
    await this.test7_RevokedTokenShouldFail();

    // Summary
    console.log('\n📊 Test Summary');
    console.log('=====================================');
    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;
    console.log(`Passed: ${passed}/${total}`);

    if (passed === total) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new AuthFlowTester();
tester.runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

