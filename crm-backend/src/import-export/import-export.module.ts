import { Module } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { ImportBatchService } from './import-batch.service';
import { CsvImportService } from './csv-import.service';
import { AutoMappingService } from './auto-mapping.service';
import { ImportExportController } from './import-export.controller';
import { CommonModule } from '@/common/common.module';
import { PrismaService } from '@/common/services/prisma.service';
import { SystemFieldOptionsModule } from '@/system-field-options/system-field-options.module';

@Module({
  imports: [CommonModule, SystemFieldOptionsModule],
  controllers: [ImportExportController],
  providers: [
    ImportExportService,
    ImportBatchService,
    CsvImportService,
    AutoMappingService,
    PrismaService, // CRITICAL: Explicitly add PrismaService to ensure injection
  ],
  exports: [ImportExportService, ImportBatchService, CsvImportService, AutoMappingService],
})
export class ImportExportModule {}






