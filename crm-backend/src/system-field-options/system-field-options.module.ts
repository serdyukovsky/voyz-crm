import { Module } from '@nestjs/common';
import { SystemFieldOptionsService } from './system-field-options.service';
import { SystemFieldOptionsController } from './system-field-options.controller';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [SystemFieldOptionsController],
  providers: [SystemFieldOptionsService],
  exports: [SystemFieldOptionsService],
})
export class SystemFieldOptionsModule {}


