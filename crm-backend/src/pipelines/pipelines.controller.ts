import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pipelines')
@Controller('pipelines')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pipelines', description: 'Retrieve all active pipelines with their stages' })
  @ApiResponse({
    status: 200,
    description: 'List of pipelines',
    type: [PipelineResponseDto],
  })
  findAll() {
    return this.pipelinesService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new pipeline', description: 'Create a new sales pipeline' })
  @ApiResponse({
    status: 201,
    description: 'Pipeline created successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createPipelineDto: CreatePipelineDto) {
    try {
      console.log('PipelinesController.create called with:', createPipelineDto);
      const result = await this.pipelinesService.create(createPipelineDto);
      console.log('PipelinesController.create result:', result);
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
}



