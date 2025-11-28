import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GlobalStatsResponseDto } from './dto/global-stats-response.dto';

@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('global')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get global statistics' })
  @ApiResponse({
    status: 200,
    description: 'Global statistics',
    type: GlobalStatsResponseDto,
  })
  async getGlobalStats(): Promise<GlobalStatsResponseDto> {
    return this.statsService.getGlobalStats();
  }
}






