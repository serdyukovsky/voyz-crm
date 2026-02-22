import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { CorsPreflightInterceptor } from './common/interceptors/cors-preflight.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { CompaniesModule } from './companies/companies.module';
import { DealsModule } from './deals/deals.module';
import { TasksModule } from './tasks/tasks.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { ActivityModule } from './activity/activity.module';
import { CommentsModule } from './comments/comments.module';
import { FilesModule } from './files/files.module';
import { ImportExportModule } from './import-export/import-export.module';
import { MessagesModule } from './messages/messages.module';
import { WebsocketModule } from './websocket/websocket.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LoggingModule } from './logging/logging.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailsModule } from './emails/emails.module';
import { StatsModule } from './stats/stats.module';
import { TagsModule } from './tags/tags.module';
// import { ChatModule } from './chat/chat.module';
import { SeedModule } from './seed/seed.module';
import { GithubWebhookModule } from './integrations/github/github-webhook.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { CorsPreflightGuard } from './common/guards/cors-preflight.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      expandVariables: true,
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    CompaniesModule,
    DealsModule,
    TasksModule,
    PipelinesModule,
    CustomFieldsModule,
    ActivityModule,
    CommentsModule,
    FilesModule,
    ImportExportModule,
    MessagesModule,
    WebsocketModule,
    SeedModule,
    IntegrationsModule,
    GithubWebhookModule,
    LoggingModule,
    AnalyticsModule,
    EmailsModule,
    StatsModule,
    TagsModule,
    // ChatModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CorsPreflightInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: CorsPreflightGuard, // Must be first to handle OPTIONS
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule {}
