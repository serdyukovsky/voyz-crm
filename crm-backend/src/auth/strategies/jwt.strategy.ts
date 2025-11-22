import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/services/prisma.service';
import { ROLE_PERMISSIONS } from '@/common/constants/permissions';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'access-secret-key',
    });
  }

  async validate(payload: any) {
    // Load user from database with permissions
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Get user permissions based on role
    const userPermissions = this.getUserPermissions(user.role, user.permissions);

    return {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: userPermissions,
    };
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

