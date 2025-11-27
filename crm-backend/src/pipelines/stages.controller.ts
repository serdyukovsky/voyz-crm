import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';

@ApiTags('Stages')
@Controller('stages')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class StagesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a stage', description: 'Update stage name, order, color, or status' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  update(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto) {
    return this.pipelinesService.updateStage(id, updateStageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stage', description: 'Delete a stage (only if no deals are in this stage)' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete stage with deals' })
  remove(@Param('id') id: string) {
    return this.pipelinesService.deleteStage(id);
  }
}





