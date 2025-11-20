import { Module } from '@nestjs/common';
import { IntegrationRegistryService } from './registry.service';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { TelegramModule } from './telegram/telegram.module';
import { VkModule } from './vk/vk.module';
import { EmailModule } from './email/email.module';
import { TelephonyModule } from './telephony/telephony.module';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [
    CommonModule,
    WhatsAppModule,
    TelegramModule,
    VkModule,
    EmailModule,
    TelephonyModule,
  ],
  providers: [IntegrationRegistryService],
  exports: [IntegrationRegistryService],
})
export class IntegrationsModule {}
