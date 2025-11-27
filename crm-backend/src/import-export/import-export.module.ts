import { Module } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}





