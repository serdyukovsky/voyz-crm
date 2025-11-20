import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DealsModule } from './deals/deals.module';
import { MessagesModule } from './messages/messages.module';
import { WebsocketModule } from './websocket/websocket.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    DealsModule,
    MessagesModule,
    WebsocketModule,
    IntegrationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}

