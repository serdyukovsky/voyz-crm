import { ApiProperty } from '@nestjs/swagger';

class DealByStageDto {
  @ApiProperty()
  stageName: string;

  @ApiProperty()
  count: number;
}

class TopCompanyDto {
  @ApiProperty()
  companyId: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  dealCount: number;

  @ApiProperty()
  totalRevenue: number;
}

class TopManagerDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  dealCount: number;

  @ApiProperty()
  totalRevenue: number;
}

export class GlobalStatsResponseDto {
  @ApiProperty()
  totalDeals: number;

  @ApiProperty({ type: [DealByStageDto] })
  dealsByStage: DealByStageDto[];

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  tasksToday: number;

  @ApiProperty()
  newContacts: number;

  @ApiProperty({ type: [TopCompanyDto] })
  topCompanies: TopCompanyDto[];

  @ApiProperty({ type: [TopManagerDto] })
  topManagers: TopManagerDto[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  revenueTrend: Array<{ date: string; revenue: number }>;
}

