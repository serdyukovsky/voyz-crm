import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';
import { WebsocketModule } from '@/websocket/websocket.module';
import { CustomFieldsModule } from '@/custom-fields/custom-fields.module';
import { TasksModule } from '@/tasks/tasks.module';
import { CommentsModule } from '@/comments/comments.module';
import { SystemFieldOptionsModule } from '@/system-field-options/system-field-options.module';
import { UsersModule } from '@/users/users.module';
import { TagsModule } from '@/tags/tags.module';

@Module({
  imports: [CommonModule, ActivityModule, WebsocketModule, CustomFieldsModule, TasksModule, CommentsModule, SystemFieldOptionsModule, UsersModule, TagsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}

