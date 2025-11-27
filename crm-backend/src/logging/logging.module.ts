import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { CommonModule } from '@/common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}





