import { Module } from '@nestjs/common';
import { VkController } from './vk.controller';
import { VkService } from './vk.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [VkController],
  providers: [VkService],
  exports: [VkService],
})
export class VkModule {}

