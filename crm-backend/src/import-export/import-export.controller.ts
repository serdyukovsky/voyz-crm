import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CsvImportService } from './csv-import.service';
import { AutoMappingService } from './auto-mapping.service';
import { ContactFieldMapping, DealFieldMapping, ImportMappingDto } from './dto/field-mapping.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Readable } from 'stream';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportExportController {
  constructor(
    private readonly csvImportService: CsvImportService,
    private readonly autoMappingService: AutoMappingService,
  ) {}

  /**
   * Получение метаданных полей для импорта
   * Возвращает список доступных полей CRM для маппинга
   */
  @Get('meta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение метаданных полей для импорта' })
  @ApiQuery({ name: 'entityType', enum: ['contact', 'deal'], required: true })
  async getImportMeta(@Query('entityType') entityType: 'contact' | 'deal') {
    return this.csvImportService.getImportMeta(entityType);
  }

  /**
   * Автоматическое сопоставление CSV колонок с полями CRM
   * Возвращает предложения маппинга с confidence scores
   */
  @Post('auto-map')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Автоматическое сопоставление CSV колонок с полями CRM' })
  @ApiQuery({ name: 'entityType', enum: ['contact', 'deal'], required: true })
  async autoMapColumns(
    @Body('columns') columns: string[],
    @Query('entityType') entityType: 'contact' | 'deal',
  ) {
    if (!Array.isArray(columns)) {
      throw new BadRequestException('columns must be an array of strings');
    }
    return this.autoMappingService.autoMapColumns(columns, entityType);
  }

  @Post('contacts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Импорт контактов из CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'dryRun', type: 'boolean', required: false, description: 'Режим предпросмотра без записи в БД' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        mapping: {
          type: 'string',
          description: 'JSON mapping для полей CSV',
        },
        delimiter: {
          type: 'string',
          enum: [',', ';'],
          default: ',',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importContacts(
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingString: string,
    @Body('delimiter') delimiter: ',' | ';' = ',',
    @Query('dryRun') dryRun: string = 'false',
    @CurrentUser() user: any,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Проверка типа файла
    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV file');
    }

    // Парсинг mapping
    let mapping: ContactFieldMapping;
    try {
      mapping = JSON.parse(mappingString || '{}');
    } catch (error) {
      throw new BadRequestException('Invalid mapping JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Валидация mapping
    if (!mapping.fullName) {
      throw new BadRequestException('Mapping must include fullName field');
    }

    // Создаем stream из файла
    const fileStream = Readable.from(file.buffer);

    // Импорт (с поддержкой dry-run)
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const result = await this.csvImportService.importContacts(
      fileStream,
      mapping,
      user.userId || user.id,
      delimiter,
      isDryRun,
    );

    return result;
  }

  @Post('deals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Импорт сделок из CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'dryRun', type: 'boolean', required: false, description: 'Режим предпросмотра без записи в БД' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        mapping: {
          type: 'string',
          description: 'JSON mapping для полей CSV',
        },
        delimiter: {
          type: 'string',
          enum: [',', ';'],
          default: ',',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importDeals(
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingString: string,
    @Body('delimiter') delimiter: ',' | ';' = ',',
    @Query('dryRun') dryRun: string = 'false',
    @CurrentUser() user: any,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Проверка типа файла
    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV file');
    }

    // Парсинг mapping
    let mapping: DealFieldMapping;
    try {
      mapping = JSON.parse(mappingString || '{}');
    } catch (error) {
      throw new BadRequestException('Invalid mapping JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Валидация mapping
    if (!mapping.number || !mapping.title || !mapping.pipelineId || !mapping.stageId) {
      throw new BadRequestException('Mapping must include number, title, pipelineId, and stageId fields');
    }

    // Создаем stream из файла
    const fileStream = Readable.from(file.buffer);

    // Импорт (с поддержкой dry-run)
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const result = await this.csvImportService.importDeals(
      fileStream,
      mapping,
      user.userId || user.id,
      undefined, // contactEmailPhoneMap - опционально
      delimiter,
      isDryRun,
    );

    return result;
  }
}

