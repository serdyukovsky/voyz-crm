import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { Pipeline, Stage } from '@prisma/client';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPipelineDto: CreatePipelineDto) {
    try {
      console.log('PipelinesService.create called with DTO:', createPipelineDto);
      
      // Validate required fields
      if (!createPipelineDto.name || !createPipelineDto.name.trim()) {
        console.error('Pipeline name validation failed:', createPipelineDto.name);
        throw new BadRequestException('Pipeline name is required');
      }

      // If this is set as default, unset other defaults
      if (createPipelineDto.isDefault) {
        await this.prisma.pipeline.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const pipelineData = {
        name: createPipelineDto.name.trim(),
        description: createPipelineDto.description?.trim() || null,
        isDefault: createPipelineDto.isDefault || false,
        isActive: true,
        order: 0,
      };

      console.log('Creating pipeline with data:', pipelineData);

      const pipeline = await this.prisma.pipeline.create({
        data: {
          ...pipelineData,
          stages: {
            create: [
              {
                name: 'Выиграно',
                order: 9998,
                color: '#10B981', // green
                isDefault: false,
                isClosed: true,
              },
              {
                name: 'Проиграно',
                order: 9999,
                color: '#EF4444', // red
                isDefault: false,
                isClosed: true,
              },
            ],
          },
        },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      console.log('Pipeline created successfully:', pipeline.id, pipeline.name);
      return pipeline;
    } catch (error) {
      console.error('Error creating pipeline:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Re-throw Prisma errors as-is for better debugging
      if (error.code) {
        console.error('Prisma error code:', error.code);
        throw new BadRequestException(`Database error: ${error.message}`);
      }
      throw new BadRequestException(`Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll() {
    console.log('[PIPELINES SERVICE] findAll called - START');
    console.log('[PIPELINES SERVICE] prisma available:', !!this.prisma);
    try {
      console.log('[PIPELINES SERVICE] Fetching pipelines from DB...');
      const pipelines = await this.prisma.pipeline.findMany({
        where: { isActive: true },
        include: { stages: { orderBy: { order: 'asc' } } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      console.log('[PIPELINES SERVICE] Found pipelines:', pipelines.length);
      return pipelines;
    } catch (error) {
      console.error('[PIPELINES SERVICE ERROR] Error in findAll:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        prismaError: error,
        errorName: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }

  async findOne(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    return pipeline;
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    const pipeline = await this.findOne(id);

    // If setting as default, unset other defaults
    if (updatePipelineDto.isDefault && !pipeline.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: updatePipelineDto,
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string) {
    return this.prisma.pipeline.delete({
      where: { id },
    });
  }

  // Stage management
  async createStage(pipelineId: string, createStageDto: CreateStageDto) {
    // Verify pipeline exists
    await this.findOne(pipelineId);

    // Check for duplicate order in the same pipeline
    const existingStage = await this.prisma.stage.findFirst({
      where: {
        pipelineId,
        order: createStageDto.order,
      },
    });

    if (existingStage) {
      throw new BadRequestException(`Stage with order ${createStageDto.order} already exists in this pipeline`);
    }

    return this.prisma.stage.create({
      data: {
        ...createStageDto,
        pipelineId,
        color: createStageDto.color || '#6B7280',
        isDefault: createStageDto.isDefault || false,
        isClosed: createStageDto.isClosed || false,
      },
      include: {
        pipeline: true,
      },
    });
  }

  async updateStage(id: string, updateStageDto: UpdateStageDto) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      include: { pipeline: true },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }

    // If updating order, check for conflicts
    if (updateStageDto.order !== undefined && updateStageDto.order !== stage.order) {
      const existingStage = await this.prisma.stage.findFirst({
        where: {
          pipelineId: stage.pipelineId,
          order: updateStageDto.order,
          id: { not: id },
        },
      });

      if (existingStage) {
        throw new BadRequestException(`Stage with order ${updateStageDto.order} already exists in this pipeline`);
      }
    }

    return this.prisma.stage.update({
      where: { id },
      data: updateStageDto,
      include: {
        pipeline: true,
      },
    });
  }

  async deleteStage(id: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { deals: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }

    // Check if stage has deals
    if (stage._count.deals > 0) {
      throw new BadRequestException(`Cannot delete stage with ${stage._count.deals} deal(s). Move deals to another stage first.`);
    }

    return this.prisma.stage.delete({
      where: { id },
    });
  }

  async reorderStages(pipelineId: string, stageOrders: { id: string; order: number }[]) {
    console.log('[PIPELINES SERVICE] reorderStages called', {
      pipelineId,
      stageOrdersCount: stageOrders.length,
      stageOrders: stageOrders.map(so => ({ id: so.id, order: so.order }))
    });

    // Verify pipeline exists
    const pipeline = await this.findOne(pipelineId);
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    // Verify all stage IDs belong to this pipeline
    const pipelineStageIds = new Set(pipeline.stages.map(s => s.id));
    const invalidStages = stageOrders.filter(so => !pipelineStageIds.has(so.id));
    if (invalidStages.length > 0) {
      throw new BadRequestException(`Invalid stage IDs: ${invalidStages.map(s => s.id).join(', ')}`);
    }

    // Use a transaction to avoid unique constraint conflicts
    // The unique constraint on (pipelineId, order) means we can't have
    // two stages with the same order in the same pipeline
    // So we update in two steps: first set to temporary values, then to final values
    return this.prisma.$transaction(async (tx) => {
      console.log('[PIPELINES SERVICE] Starting transaction for reorder');
      
      // Step 1: Set all stages to negative orders to avoid conflicts
      // We use negative values that are guaranteed to be unique
      const negativeUpdates = stageOrders.map(({ id }, index) =>
        tx.stage.update({
          where: { id },
          data: { order: -(index + 1) },
        }),
      );
      await Promise.all(negativeUpdates);
      console.log('[PIPELINES SERVICE] Step 1 complete: Set negative orders');

      // Step 2: Set all stages to their correct orders
      const positiveUpdates = stageOrders.map(({ id, order }) =>
        tx.stage.update({
          where: { id },
          data: { order },
        }),
      );
      await Promise.all(positiveUpdates);
      console.log('[PIPELINES SERVICE] Step 2 complete: Set final orders');

      // Return the updated pipeline using the transaction client
      const updatedPipeline = await tx.pipeline.findUnique({
        where: { id: pipelineId },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      if (!updatedPipeline) {
        throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
      }

      console.log('[PIPELINES SERVICE] Transaction complete, returning pipeline with stages:', 
        updatedPipeline.stages.map(s => ({ id: s.id, name: s.name, order: s.order }))
      );

      return updatedPipeline;
    });
  }
}

