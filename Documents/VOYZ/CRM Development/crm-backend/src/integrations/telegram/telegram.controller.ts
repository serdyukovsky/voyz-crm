import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook/:token')
  @UseGuards(new WebhookGuard({}))
  async handleWebhook(@Body() payload: any, @Param('token') token: string) {
    await this.telegramService.receiveMessage(payload);
    return { status: 'ok' };
  }
}

