import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ArgumentsHost } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    console.error('Stack:', error.stack);
  });

  // CORS Configuration - MUST be before cookie parser and other middleware
  // Allow GitHub Codespaces origins (https://*.app.github.dev)
  // and local development origins (localhost:5173, localhost:3000)
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  // Enable CORS with proper configuration
  app.enableCors({
    origin: (origin, callback) => {
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

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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

bootstrap();
