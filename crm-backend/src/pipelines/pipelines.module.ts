import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { StagesController } from './stages.controller';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [PipelinesController, StagesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}

