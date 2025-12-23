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
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CsvImportService } from './csv-import.service';
import { AutoMappingService } from './auto-mapping.service';
import { ContactFieldMapping, DealFieldMapping, ImportMappingDto } from './dto/field-mapping.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { ImportDealsDto } from './dto/import-deals.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportExportController {
  constructor(
    private readonly csvImportService: CsvImportService,
    private readonly autoMappingService: AutoMappingService,
  ) {
    console.log('🔥 ImportExportController initialized');
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
        workspaceId: {
          type: 'string',
          description: 'ID workspace (optional, falls back to user.workspaceId)',
        },
        defaultAssignedToId: {
          type: 'string',
          description: 'ID ответственного по умолчанию (применяется ко всем строкам)',
        },
      },
      required: ['rows', 'mapping', 'pipelineId'],
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
    console.error('🔥🔥🔥 CONTROLLER ENTRY - importDeals endpoint called');
    console.error('🔥 Request path:', req.path);
    console.error('🔥 Request method:', req.method);
    console.error('🔥 Request URL:', req.url);
    console.error('🔥 Content-Type:', req.headers['content-type']);
    console.error('🔥 DTO keys:', dto ? Object.keys(dto) : 'null');
    console.error('🔥 Has rows:', !!dto?.rows);
    console.error('🔥 Rows count:', dto?.rows?.length || 0);
    console.error('🔥 dryRun query param:', dryRun);
    console.error('🔥 isDryRun:', isDryRun);
    // 🔥 DIAGNOSTIC: Log controller entry
    console.log('🔥 CONTROLLER ENTRY - importDeals endpoint called');
    console.log('🔥 Raw DTO type:', typeof dto);
    console.log('🔥 Raw DTO keys:', dto ? Object.keys(dto) : 'null');
    
    console.log('🔥 DTO received:', {
      hasRows: !!dto?.rows,
      rowsCount: dto?.rows?.length || 0,
      hasMapping: !!dto?.mapping,
      mappingKeys: dto?.mapping ? Object.keys(dto.mapping) : [],
      pipelineId: dto?.pipelineId,
      workspaceId: dto?.workspaceId,
      hasFile: 'file' in (dto || {}),
      allKeys: dto ? Object.keys(dto) : [],
      dryRun,
      isDryRun,
    });
    
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
    
    // Resolve workspaceId: priority: request.body.workspaceId > user.workspaceId
    const workspaceId = dto.workspaceId || user?.workspaceId;
    console.log('[IMPORT CONTROLLER]', { 
      workspaceId, 
      workspaceIdFromBody: dto.workspaceId, 
      userWorkspaceId: user?.workspaceId,
      userId: user?.id || user?.userId,
      userObject: user ? {
        id: user.id || user.userId,
        email: user.email,
        hasWorkspaceId: !!user.workspaceId,
        workspaceId: user.workspaceId,
        allKeys: Object.keys(user),
      } : null,
      dryRun,
      isDryRun,
      rowsCount: dto?.rows?.length || 0
    });
    
    // CRITICAL: Warn if workspaceId is missing in actual import
    if (!isDryRun && !workspaceId) {
      console.error('[IMPORT CONTROLLER] ⚠️ WARNING: workspaceId is missing in actual import!');
      console.error('[IMPORT CONTROLLER] This will prevent deals from being created.');
    }
    
    // CRITICAL: Validate rows - CSV parsing is done on frontend
    // In dry-run, return globalErrors instead of throwing
    if (!dto.rows || !Array.isArray(dto.rows) || dto.rows.length === 0) {
      if (isDryRun) {
        // In dry-run, NEVER throw - always return 200 with errors
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

    // Валидация pipelineId
    if (!dto.pipelineId || typeof dto.pipelineId !== 'string') {
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
          globalErrors: ['pipelineId is required'],
        };
      }
      throw new BadRequestException('pipelineId is required');
    }
    
    // CRITICAL: Wrap entire import in try/catch to prevent 500 errors in dry-run
    try {
      console.log('[IMPORT CONTROLLER] About to call csvImportService.importDeals:', {
        rowsCount: dto.rows?.length || 0,
        hasMapping: !!dto.mapping,
        pipelineId: dto.pipelineId,
        workspaceId,
        hasUser: !!user,
        userId: user?.id || user?.userId,
        isDryRun,
      });
      
      const result = await this.csvImportService.importDeals(
        dto.rows, // Parsed CSV rows from frontend
        dto.mapping,
        user, // Передаем весь объект user для валидации
        dto.pipelineId,
        workspaceId, // Explicit workspaceId (from body or user)
        dto.defaultAssignedToId, // Дефолтный ответственный для всех строк
        undefined, // contactEmailPhoneMap - опционально
        isDryRun,
      );
      
      console.log('[IMPORT CONTROLLER] csvImportService.importDeals completed successfully');

      // Log dry-run result for debugging
      if (isDryRun) {
        console.log('[DRY RUN RESULT]', JSON.stringify(result, null, 2));
      }

      return result;
    } catch (error) {
      // In dry-run mode, NEVER throw 500 - always return errors in ImportResult
      if (isDryRun) {
        console.error('[IMPORT DEALS DRY RUN ERROR]', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          summary: {
            total: 0,
            created: 0,
            updated: 0,
            failed: 0,
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

