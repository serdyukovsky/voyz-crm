import { Module } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { ImportBatchService } from './import-batch.service';
import { CsvImportService } from './csv-import.service';
import { ImportExportController } from './import-export.controller';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ImportExportController],
  providers: [ImportExportService, ImportBatchService, CsvImportService],
  exports: [ImportExportService, ImportBatchService, CsvImportService],
})
export class ImportExportModule {}






