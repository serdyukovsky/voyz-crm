import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [CommonModule, ActivityModule, WebsocketModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}





