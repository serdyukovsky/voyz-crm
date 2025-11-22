import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [CommonModule, ActivityModule, WebsocketModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

