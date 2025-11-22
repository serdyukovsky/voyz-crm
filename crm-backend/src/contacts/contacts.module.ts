import { Module, forwardRef } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { CommonModule } from '@/common/common.module';
import { ActivityModule } from '@/activity/activity.module';
import { WebsocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [
    CommonModule,
    ActivityModule,
    forwardRef(() => WebsocketModule),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}

