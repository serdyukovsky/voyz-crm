import { Module, Global } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}
