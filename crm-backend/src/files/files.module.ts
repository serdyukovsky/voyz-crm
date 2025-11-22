import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { CommonModule } from '@/common/common.module';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [CommonModule, WebsocketModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

