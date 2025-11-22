import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    IntegrationsModule,
    LoggingModule,
    AnalyticsModule,
    EmailsModule,
    StatsModule,
  ],
  providers: [
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

