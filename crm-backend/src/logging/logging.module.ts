import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LoggingController } from './logging.controller';
import { CommonModule } from '@/common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}






