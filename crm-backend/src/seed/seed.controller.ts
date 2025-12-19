import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SeedService } from './seed.service';

@Controller('seed')
@UseGuards(JwtAuthGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('test-data')
  async createTestData() {
    return this.seedService.createTestData();
  }
}

