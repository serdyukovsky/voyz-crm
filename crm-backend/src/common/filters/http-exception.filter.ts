import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // 🔥 DIAGNOSTIC: Log all exceptions, especially for import endpoints
    if (request.path?.includes('/import/deals')) {
      console.error('🔥 EXCEPTION FILTER - Import deals error:', {
        status,
        path: request.path,
        method: request.method,
        message: typeof message === 'string' ? message : (message as any).message,
        error: typeof message === 'object' ? (message as any).error : undefined,
        bodyKeys: request.body ? Object.keys(request.body) : [],
        hasRows: !!request.body?.rows,
        exception: exception instanceof Error ? exception.message : String(exception),
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
      error: typeof message === 'object' ? (message as any).error : undefined,
    });
  }
}

