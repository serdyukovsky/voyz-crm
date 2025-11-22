import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [CommonModule, ActivityModule, WebsocketModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}

