import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';

export class ActivityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @ApiProperty({ required: false })
  dealId?: string;

  @ApiProperty({ required: false })
  taskId?: string;

  @ApiProperty({ required: false })
  contactId?: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false, type: 'object' })
  payload?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

