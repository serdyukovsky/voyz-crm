import { Module } from '@nestjs/common';
import { SystemFieldOptionsService } from './system-field-options.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  providers: [SystemFieldOptionsService],
  exports: [SystemFieldOptionsService],
})
export class SystemFieldOptionsModule {}

