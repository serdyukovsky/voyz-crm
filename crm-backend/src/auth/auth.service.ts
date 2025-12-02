import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/services/prisma.service';
import { UsersService } from '@/users/users.service';
import { LoggingService } from '@/logging/logging.service';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '@/common/constants/permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService, // Access token service
    @Inject('JwtRefreshService')
    private readonly jwtRefreshService: JwtService, // Refresh token service
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Normalize email (lowercase and trim)
    const normalizedEmail = email?.toLowerCase().trim();
    
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Verify password - try bcrypt first (for local dev), then argon2
    let isValid = false;
    
    // Check if password is bcrypt hashed (starts with $2a$, $2b$, or $2y$)
    if (user.password.startsWith('$2')) {
      try {
        const bcrypt = await import('bcrypt');
        isValid = await bcrypt.compare(password, user.password);
      } catch (error) {
        console.error('Bcrypt verification error:', error);
        return null;
      }
    } else {
      // Try argon2 for other hashes
      try {
        isValid = await argon2.verify(user.password, password);
      } catch (error) {
        console.error('Argon2 verification error:', error);
        return null;
      }
    }
    
    if (!isValid) {
      return null;
    }

    const { password: _, ...result } = user;

    // Get user permissions
    const userPermissions = this.getUserPermissions(result.role, result.permissions);

    return {
      ...result,
      permissions: userPermissions,
    };
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') || '15m',
    });

    // Generate refresh token (30 days)
    const refreshToken = await this.createRefreshToken(user.id);

    // Log login action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'login',
        userId: user.id,
        message: `User ${user.email} logged in`,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Failed to log login action:', error);
    }

    const { password: _, permissions: __, ...userResponse } = user;

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      user: userResponse,
    };
  }

  async register(registerDto: RegisterDto, currentUser?: any) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only admin can register users
    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can register new users');
    }

    // Default role is MANAGER if not specified
    const role = registerDto.role || UserRole.MANAGER;

    // Create user (password will be hashed with argon2 in UsersService)
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role,
    });

    const { password: _, ...userResponse } = user;

    return {
      message: 'User registered successfully',
      user: userResponse,
    };
  }

  async refreshToken(token: string) {
    // Verify refresh token signature first
    let payload: any;
    try {
      payload = this.jwtRefreshService.verify(token);
    } catch (error) {
      // If token is invalid or expired, check if it exists in DB (reuse detection)
      const existingToken = await this.prisma.refreshToken.findUnique({
        where: { token },
      });
      
      if (existingToken) {
        // Token reuse detected - invalidate all tokens for this user
        await this.invalidateUserRefreshTokens(existingToken.userId);
      }
      
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find refresh token in database
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { permissions: true } } },
    });

    if (!refreshToken) {
      // Token reuse detected - invalidate all refresh tokens for this user
      await this.invalidateUserRefreshTokens(payload.sub);
      throw new UnauthorizedException('Refresh token not found - possible reuse attack');
    }

    // Check if token is expired (double check)
    if (refreshToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if user is active
    if (!refreshToken.user.isActive) {
      // Delete token for inactive user
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      throw new UnauthorizedException('User is not active');
    }

    // Check if token belongs to the user from payload
    if (refreshToken.userId !== payload.sub) {
      // Token reuse detected - invalidate all tokens for both users
      await this.invalidateUserRefreshTokens(refreshToken.userId);
      await this.invalidateUserRefreshTokens(payload.sub);
      throw new UnauthorizedException('Token mismatch - possible reuse attack');
    }

    // Generate new access token
    const userPermissions = this.getUserPermissions(
      refreshToken.user.role,
      refreshToken.user.permissions,
    );

    const accessPayload = {
      email: refreshToken.user.email,
      sub: refreshToken.user.id,
      role: refreshToken.user.role,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') || '15m',
    });

    // Rotate refresh token: delete old and create new
    await this.prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });

    const newRefreshToken = await this.createRefreshToken(refreshToken.user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken.token,
    };
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string, userAgent?: string) {
    // Get user info before logout for logging
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (refreshToken) {
      // Delete specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await this.invalidateUserRefreshTokens(userId);
    }

    // Log logout action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'logout',
        userId: userId,
        message: user ? `User ${user.email} logged out` : `User ${userId} logged out`,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Failed to log logout action:', error);
    }

    return { message: 'Logged out successfully' };
  }

  private async createRefreshToken(userId: string) {
    const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '30d';
    
    // Calculate expiresAt date
    const expiresAt = new Date();
    const days = expiresIn.includes('d') 
      ? parseInt(expiresIn.replace('d', '')) 
      : 30;
    expiresAt.setDate(expiresAt.getDate() + days);

    // Generate refresh token with refresh secret
    const token = this.jwtRefreshService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn },
    );

    return this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  private async invalidateUserRefreshTokens(userId: string) {
    // Delete all refresh tokens for user (protection against reuse attacks)
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private getUserPermissions(role: UserRole, userPermissions: any[]): string[] {
    // Admins have all permissions
    if (role === UserRole.ADMIN) {
      return ROLE_PERMISSIONS.ADMIN;
    }

    // Get base permissions for role
    const basePermissions = ROLE_PERMISSIONS[role] || [];

    // Add custom permissions from database
    const customPermissions = userPermissions.map((up) => up.permission);

    // Combine and remove duplicates
    return [...new Set([...basePermissions, ...customPermissions])];
  }
}
