import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CsvImportService } from './csv-import.service';
import { AutoMappingService } from './auto-mapping.service';
import { ContactFieldMapping, DealFieldMapping, ImportMappingDto } from './dto/field-mapping.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { ImportDealsDto } from './dto/import-deals.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/common/services/prisma.service';

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportExportController {
  constructor(
    private readonly csvImportService: CsvImportService,
    private readonly autoMappingService: AutoMappingService,
    private readonly prisma: PrismaService,
  ) {
  }

  /**
   * Получение метаданных полей для импорта
   * Возвращает список доступных полей CRM для маппинга
   */
  @Get('meta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение метаданных полей для импорта' })
  @ApiQuery({ name: 'entityType', enum: ['contact', 'deal'], required: true })
  async getImportMeta(@Query('entityType') entityType: 'contact' | 'deal') {
    try {
      const result: any = await this.csvImportService.getImportMeta(entityType);
      return result;
    } catch (error) {
      console.error('🔥🔥🔥 ImportExportController.getImportMeta - ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        entityType,
      });
      throw error;
    }
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

  // CRITICAL: @Post('deals') MUST come BEFORE @Post('contacts')
  // NestJS processes routes in declaration order, and FileInterceptor on contacts
  // can intercept requests if deals comes after contacts
  @Post('deals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Импорт сделок из CSV' })
  @ApiConsumes('application/json')
  @ApiQuery({ name: 'dryRun', type: 'boolean', required: false, description: 'Режим предпросмотра без записи в БД' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          description: 'Parsed CSV rows from frontend (CSV parsing is done on frontend)',
          items: {
            type: 'object',
            additionalProperties: { type: 'string' }
          }
        },
        mapping: {
          type: 'object',
          description: 'Mapping from CRM fields to CSV column names',
        },
        pipelineId: {
          type: 'string',
          description: 'ID пайплайна для resolution стадий',
        },
        defaultAssignedToId: {
          type: 'string',
          description: 'ID ответственного по умолчанию (применяется ко всем строкам)',
        },
      },
      required: ['rows', 'mapping'], // pipelineId is optional - used only for soft validation
    },
  })
  async importDeals(
    @Body() dto: any, // Use 'any' to bypass ValidationPipe issues temporarily
    @Query('dryRun') dryRun: string = 'false',
    @CurrentUser() user: any,
    @Req() req: Request, // Add request object for debugging
  ): Promise<ImportResultDto> {
    // CRITICAL: Determine dry-run mode FIRST (before any usage)
    const isDryRun = dryRun === 'true' || dryRun === '1';
    
    // 🔥 CRITICAL: Log immediately to confirm this endpoint is called
    if (dto && typeof dto === 'object') {
    }
    
    // CRITICAL: Check if dto is empty or null
    if (!dto || typeof dto !== 'object' || Object.keys(dto).length === 0) {
      console.error('🔥 ERROR: DTO is empty or null!');
      console.error('🔥 DTO value:', dto);
      if (isDryRun) {
        return {
          summary: { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 },
          errors: [],
          globalErrors: ['Request body is empty. Please send rows and mapping as JSON.'],
        };
      }
      throw new BadRequestException('Request body is empty. Please send rows and mapping as JSON.');
    }
    
    
    // CRITICAL: Check if file is somehow in the request
    if (dto && 'file' in dto) {
      console.error('🔥 ERROR: file found in DTO! This should not happen.');
      console.error('🔥 DTO keys:', Object.keys(dto));
      if (isDryRun) {
        return {
          summary: { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 },
          errors: [],
          globalErrors: ['Invalid request: file field should not be present. Use rows instead.'],
        };
      }
      throw new BadRequestException('Invalid request: file field should not be present. Use rows instead.');
    }
    
    
    // CRITICAL: Validate rows - CSV parsing is done on frontend
    // In dry-run, return globalErrors instead of throwing
    if (!dto.rows || !Array.isArray(dto.rows) || dto.rows.length === 0) {
      if (isDryRun) {
        return {
          summary: {
            total: 0,
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
          },
          errors: [],
          globalErrors: ['Rows are required and must be a non-empty array'],
        };
      }
      throw new BadRequestException('Rows are required and must be a non-empty array');
    }

    // Limit rows to prevent OOM on large imports
    const MAX_IMPORT_ROWS = 10_000;
    if (dto.rows.length > MAX_IMPORT_ROWS) {
      const msg = `Too many rows (${dto.rows.length}). Maximum is ${MAX_IMPORT_ROWS} per import. Please split the file.`;
      if (isDryRun) {
        return {
          summary: { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 },
          errors: [],
          globalErrors: [msg],
        };
      }
      throw new BadRequestException(msg);
    }

    // Validate mapping
    if (!dto.mapping || typeof dto.mapping !== 'object') {
      if (isDryRun) {
        return {
          summary: {
            total: 0,
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
          },
          errors: [],
          globalErrors: ['Mapping is required and must be an object'],
        };
      }
      throw new BadRequestException('Mapping is required and must be an object');
    }

    // Валидация mapping - title обязателен
    if (!dto.mapping.title) {
      if (isDryRun) {
        return {
          summary: {
            total: 0,
            created: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
          },
          errors: [],
          globalErrors: ['Mapping must include title field'],
        };
      }
      throw new BadRequestException('Mapping must include title field');
    }

    // PipelineId validation - required for actual import, optional for dry-run
    // For actual import, pipelineId is required because deals must belong to a pipeline
    if (!isDryRun) {
      if (!dto.pipelineId || dto.pipelineId === null || typeof dto.pipelineId !== 'string' || dto.pipelineId.trim() === '') {
        throw new BadRequestException('Pipeline ID is required for deal import');
      }
    }
    
    // CRITICAL: Wrap entire import in try/catch to prevent 500 errors in dry-run
    try {
      
      const result = await this.csvImportService.importDeals(
        dto.rows, // Parsed CSV rows from frontend
        dto.mapping,
        user, // Передаем весь объект user для валидации
        dto.pipelineId, // Pass as-is (undefined is allowed for dry-run, validated above for actual import)
        dto.defaultAssignedToId, // Дефолтный ответственный для всех строк
        undefined, // contactEmailPhoneMap - опционально
        isDryRun,
        dto.userValueMapping, // Manual mapping: { "CSV value": "user-id" }
      );
      

      // Log dry-run result for debugging
      if (isDryRun) {
      }

      return result;
    } catch (error) {
      // Log detailed error information for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('[IMPORT DEALS CONTROLLER ERROR]', {
        error: errorMessage,
        stack: errorStack,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        isDryRun,
        pipelineId: dto.pipelineId,
        rowsCount: dto.rows?.length || 0,
        hasMapping: !!dto.mapping,
      });
      
      // In dry-run mode, NEVER throw 500 - always return errors in ImportResult
      if (isDryRun) {
        return {
          summary: {
            total: dto.rows?.length || 0,
            created: 0,
            updated: 0,
            failed: dto.rows?.length || 0,
            skipped: 0,
          },
          errors: [{
            row: -1,
            error: `Dry-run validation error: ${errorMessage}`,
          }],
          globalErrors: [`Dry-run validation error: ${errorMessage}`],
        };
      }
      // For actual import, re-throw to let global exception filter handle it
      throw error;
    }
  }
}

