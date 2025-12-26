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
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : 'N/A';
      console.error('🔥 EXCEPTION FILTER - Import deals error:', {
        status,
        path: request.path,
        method: request.method,
        errorMessage,
        errorStack,
        message: typeof message === 'string' ? message : (message as any).message,
        error: typeof message === 'object' ? (message as any).error : undefined,
        bodyKeys: request.body ? Object.keys(request.body) : [],
        hasRows: !!request.body?.rows,
        rowsCount: request.body?.rows?.length || 0,
        hasMapping: !!request.body?.mapping,
        pipelineId: request.body?.pipelineId,
        exceptionType: exception instanceof Error ? exception.constructor.name : typeof exception,
        exception: exception instanceof Error ? exception.message : String(exception),
      });
    }

    // In development, include more error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
      error: typeof message === 'object' ? (message as any).error : undefined,
    };

    // Include stack trace in development mode for debugging
    if (isDevelopment && exception instanceof Error && exception.stack) {
      errorResponse.stack = exception.stack;
      errorResponse.errorMessage = exception.message;
    }

    response.status(status).json(errorResponse);
  }
}

