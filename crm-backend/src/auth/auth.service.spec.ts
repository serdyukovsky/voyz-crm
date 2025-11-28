import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/common/services/prisma.service';
import { UsersService } from '@/users/users.service';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let jwtRefreshService: JwtService;
  let usersService: UsersService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MANAGER,
    isActive: true,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('access-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: 'JwtRefreshService',
          useValue: {
            sign: jest.fn().mockReturnValue('refresh-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ACCESS_TOKEN_EXPIRES_IN: '15m',
                REFRESH_TOKEN_EXPIRES_IN: '30d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jwtRefreshService = module.get<JwtService>('JwtRefreshService');
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
    });

    it('should return null if user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and refresh token', async () => {
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({
        id: '1',
        token: 'refresh-token',
        userId: '1',
        expiresAt: new Date(),
        createdAt: new Date(),
      } as any);

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('refreshToken', () => {
    it('should return new access token and refresh token', async () => {
      const refreshTokenData = {
        id: '1',
        token: 'refresh-token',
        userId: '1',
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(),
        user: mockUser,
      };

      jest.spyOn(jwtRefreshService, 'verify').mockReturnValue({ sub: '1' });
      jest.spyOn(prismaService.refreshToken, 'findUnique').mockResolvedValue(
        refreshTokenData as any,
      );
      jest.spyOn(prismaService.refreshToken, 'delete').mockResolvedValue({} as any);
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({
        id: '2',
        token: 'new-refresh-token',
        userId: '1',
        expiresAt: new Date(),
        createdAt: new Date(),
      } as any);

      const result = await service.refreshToken('refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      jest.spyOn(jwtRefreshService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should invalidate all tokens if reuse detected', async () => {
      jest.spyOn(jwtRefreshService, 'verify').mockReturnValue({ sub: '1' });
      jest.spyOn(prismaService.refreshToken, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.refreshToken, 'deleteMany').mockResolvedValue({ count: 0 });

      await expect(service.refreshToken('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      jest.spyOn(prismaService.refreshToken, 'deleteMany').mockResolvedValue({ count: 1 });

      const result = await service.logout('1');

      expect(result).toHaveProperty('message');
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
    });
  });
});






