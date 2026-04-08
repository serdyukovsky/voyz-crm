import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './services/prisma.service';
import { CleanupService } from './services/cleanup.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [HealthController],
  providers: [PrismaService, CleanupService],
  exports: [PrismaService],
})
export class CommonModule {}
