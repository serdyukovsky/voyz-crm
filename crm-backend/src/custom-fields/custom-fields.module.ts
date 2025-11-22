import { Module } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}

