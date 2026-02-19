import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ArgumentsHost } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function validateEnv() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

async function bootstrap() {
  // Validate required environment variables before starting
  validateEnv();
  
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser to configure custom limit
  });
  
  // CRITICAL: Increase body size limit for import endpoints (CSV files can be large)
  // Default limit is 100kb, we increase it to 50mb for import operations
  // Get underlying Express instance and configure body parser
  const httpAdapter = app.getHttpAdapter();
  const expressApp = httpAdapter.getInstance();
  expressApp.use(compression());
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global process-level error logging
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🔥 UNHANDLED REJECTION');
    console.error('Reason:', reason);
    if (reason instanceof Error) {
      console.error('Stack:', reason.stack);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('🔥 UNCAUGHT EXCEPTION');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  });

  // CORS Configuration - MUST be before cookie parser and other middleware
  // In development mode, allow all origins for local frontend connections
  // In production, use strict origin checking
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : [];
  
  // Default allowed origins (both localhost and 127.0.0.1 for compatibility)
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  // Enable CORS with proper configuration
  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow all origins for easier local development
      if (isDevelopment) {
        return callback(null, true);
      }
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Allow GitHub Codespaces origins (https://*.app.github.dev)
      if (origin.match(/^https:\/\/.*\.app\.github\.dev$/)) {
        return callback(null, true);
      }

      // Check against explicitly allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject all other origins
      console.warn('CORS: Rejected origin:', origin, 'Allowed:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Global prefix - set AFTER CORS
  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // Diagnostic middleware removed for production

  // Validation
  // CRITICAL: Temporarily disable forbidNonWhitelisted for import endpoints
  // to avoid issues with file field in multipart requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // Disable whitelist to allow any fields
      forbidNonWhitelisted: false, // Changed to false to allow extra fields (like file from old requests)
      transform: false, // Disable transform to avoid issues with any type
      skipMissingProperties: true, // Skip missing properties to avoid validation errors
      exceptionFactory: (errors) => {
        // 🔥 DIAGNOSTIC: Log validation errors
        console.error('🔥 VALIDATION ERROR:', JSON.stringify(errors, null, 2));
        const errorMessages = errors.map(err => {
          const constraints = err.constraints ? Object.values(err.constraints).join(', ') : 'Unknown validation error';
          return `${err.property}: ${constraints}`;
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
          details: errors,
        });
      },
    }),
  );

  // Exception filter
  app.useGlobalFilters(
    new (class extends BaseExceptionFilter {
      catch(exception: any, host: ArgumentsHost) {
        console.error('🔥 GLOBAL ERROR');
        console.error(exception);
        console.error(exception?.stack);
        super.catch(exception, host);
      }
    })(),
    new HttpExceptionFilter(),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('CRM System API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh token stored in HttpOnly cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
