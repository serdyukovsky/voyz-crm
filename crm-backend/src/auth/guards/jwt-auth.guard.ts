import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoggingService } from '@/logging/logging.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private loggingService: LoggingService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Allow OPTIONS requests (CORS preflight) without authentication
    if (request.method === 'OPTIONS') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      // Try to extract user ID from token if available
      let userId: string | undefined;
      try {
        const request = context.switchToHttp().getRequest();
        const token = request.headers?.authorization?.replace('Bearer ', '');
        if (token) {
          // Try to decode token to get user ID (without verification)
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub;
        }
      } catch {
        // Ignore errors in token parsing
      }

      // Log automatic logout due to invalid/expired token (fire and forget)
      if (userId) {
        this.loggingService.create({
          level: 'warning',
          action: 'logout',
          userId,
          message: 'Automatic logout due to invalid or expired token',
          metadata: {
            reason: err?.message || info?.message || 'Token validation failed',
          },
        }).catch((logError) => {
          // Don't fail the request if logging fails
          console.error('Failed to log automatic logout:', logError);
        });
      }

      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}

