import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { CommonModule } from '@/common/common.module';
import { WsModule } from '@/ws/ws.module';

@Module({
  imports: [CommonModule, WsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}

