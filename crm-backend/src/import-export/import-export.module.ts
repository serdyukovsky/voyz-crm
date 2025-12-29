import { Module } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { ImportBatchService } from './import-batch.service';
import { CsvImportService } from './csv-import.service';
import { AutoMappingService } from './auto-mapping.service';
import { ImportExportController } from './import-export.controller';
import { CommonModule } from '@/common/common.module';
import { PrismaService } from '@/common/services/prisma.service';
import { SystemFieldOptionsModule } from '@/system-field-options/system-field-options.module';
import { CustomFieldsModule } from '@/custom-fields/custom-fields.module';

@Module({
  imports: [CommonModule, SystemFieldOptionsModule, CustomFieldsModule],
  controllers: [ImportExportController],
  providers: [
    ImportExportService,
    ImportBatchService,
    CsvImportService,
    AutoMappingService,
  ],
  exports: [ImportExportService, ImportBatchService, CsvImportService, AutoMappingService],
})
export class ImportExportModule {}






