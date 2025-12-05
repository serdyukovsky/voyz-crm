import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CorsPreflightInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin;
      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
        : ['http://localhost:5173', 'http://localhost:3000'];

      // Allow GitHub Codespaces origins
      const isAllowedOrigin = !origin || 
        origin.match(/^https:\/\/.*\.app\.github\.dev$/) ||
        allowedOrigins.includes(origin);

      if (isAllowedOrigin) {
        response.header('Access-Control-Allow-Origin', origin || '*');
        response.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.header('Access-Control-Allow-Credentials', 'true');
        response.status(200).end();
        return new Observable((subscriber) => {
          subscriber.complete();
        });
      }
    }

    return next.handle();
  }
}




