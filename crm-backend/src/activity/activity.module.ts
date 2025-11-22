import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivitiesController } from './activities.controller';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ActivitiesController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}

