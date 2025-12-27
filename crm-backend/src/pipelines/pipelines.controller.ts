import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PipelineResponseDto } from './dto/pipeline-response.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/common/constants/permissions';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pipelines')
@Controller('pipelines')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @Permissions(PERMISSIONS.PIPELINES_VIEW)
  @ApiOperation({ summary: 'Get all pipelines', description: 'Retrieve all active pipelines with their stages' })
  @ApiResponse({
    status: 200,
    description: 'List of pipelines',
    type: [PipelineResponseDto],
  })
  async findAll(@CurrentUser() user?: any) {
    try {
      const result = await this.pipelinesService.findAll();
      return result;
    } catch (error) {
      console.error('🔥🔥🔥 PipelinesController.findAll - ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new pipeline', description: 'Create a new sales pipeline (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Pipeline created successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createPipelineDto: CreatePipelineDto) {
    try {
      const result = await this.pipelinesService.create(createPipelineDto);
      return result;
    } catch (error) {
      console.error('PipelinesController.create error:', error);
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipeline', description: 'Update pipeline name, description, or status' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline updated successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  update(@Param('id') id: string, @Body() updatePipelineDto: UpdatePipelineDto) {
    return this.pipelinesService.update(id, updatePipelineDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a pipeline', description: 'Delete a pipeline (Admin only)' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  remove(@Param('id') id: string) {
    return this.pipelinesService.remove(id);
  }

  @Post(':id/stages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a stage in a pipeline', description: 'Add a new stage to a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 201,
    description: 'Stage created successfully',
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  createStage(@Param('id') pipelineId: string, @Body() createStageDto: CreateStageDto) {
    return this.pipelinesService.createStage(pipelineId, createStageDto);
  }

  @Patch(':id/stages/reorder')
  @ApiOperation({ summary: 'Reorder stages in a pipeline', description: 'Update the order of multiple stages at once' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Stages reordered successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid stage orders' })
  reorderStages(@Param('id') pipelineId: string, @Body() reorderDto: ReorderStagesDto) {
    return this.pipelinesService.reorderStages(pipelineId, reorderDto.stageOrders);
  }
}



