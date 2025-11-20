import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/telephony')
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('webhook')
  @UseGuards(new WebhookGuard({}))
  async handleWebhook(@Body() payload: any) {
    await this.telephonyService.processCallEvent(payload);
    return { status: 'ok' };
  }
}

