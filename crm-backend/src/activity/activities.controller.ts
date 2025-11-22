import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ActivitiesController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get activities with filters' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of activities',
    type: [ActivityResponseDto]
  })
  async findAll(@Query() filters: ActivityFilterDto): Promise<ActivityResponseDto[]> {
    return this.activityService.findAll(filters);
  }
}

