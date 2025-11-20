import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { CommonModule } from '@/common/common.module';
import { WsModule } from '@/ws/ws.module';

@Module({
  imports: [CommonModule, WsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}

