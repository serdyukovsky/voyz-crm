import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';

@Module({
  imports: [CommonModule, ActivityModule],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}





