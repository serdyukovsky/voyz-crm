import { Controller, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeedService } from './seed.service';

@Controller('seed')
@UseGuards(JwtAuthGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('test-data')
  async createTestData() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return this.seedService.createTestData();
  }
}

