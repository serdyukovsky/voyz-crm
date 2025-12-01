import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Guard that allows OPTIONS requests (CORS preflight) to pass through
 * without authentication. This must be registered BEFORE JwtAuthGuard.
 */
@Injectable()
export class CorsPreflightGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Always allow OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    return true; // This guard only handles OPTIONS, all other requests pass through
  }
}

