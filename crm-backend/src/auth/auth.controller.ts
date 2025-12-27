import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password. Returns access token and sets refresh token in HttpOnly cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(req.user, ipAddress, userAgent);

    // Set refresh token in HttpOnly cookie
    const refreshTokenExpiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    ) || '30d';
    const maxAge = this.parseExpiresIn(refreshTokenExpiresIn);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: maxAge,
      domain: isProduction ? this.configService.get<string>('COOKIE_DOMAIN') : undefined,
    });

    // Return only access token and user (refresh token is in cookie)
    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register new user (Admin only)',
    description: 'Create a new user account. Only administrators can register new users.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only admins can register users',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.authService.register(registerDto, currentUser);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using the refresh token stored in HttpOnly cookie. Refresh token is rotated for security.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set new refresh token in cookie
    const refreshTokenExpiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    ) || '30d';
    const maxAge = this.parseExpiresIn(refreshTokenExpiresIn);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: maxAge,
      domain: isProduction ? this.configService.get<string>('COOKIE_DOMAIN') : undefined,
    });

    // Return only access token (refresh token is in cookie)
    return {
      access_token: result.access_token,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the currently authenticated user. Returns 401 if token is invalid or expired.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  async getCurrentUser(@CurrentUser() user: any) {
    const userData = await this.authService.getCurrentUser(user.userId || user.id);
    const { permissions: __, ...userResponse } = userData;
    return userResponse;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate refresh token and clear cookie. Requires valid access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  async logout(
    @CurrentUser() user: any,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    // Delete refresh token from database
    const ipAddress = req.ip || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await this.authService.logout(user.userId || user.id, refreshToken, typeof ipAddress === 'string' ? ipAddress : String(ipAddress), userAgent);

    // Clear refresh token cookie
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth',
      domain: isProduction ? this.configService.get<string>('COOKIE_DOMAIN') : undefined,
    });

    return { message: 'Logged out successfully' };
  }

  private parseExpiresIn(expiresIn: string): number {
    // Parse expiresIn string (e.g., "30d", "7d", "15m") to milliseconds
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // Default 30 days
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
