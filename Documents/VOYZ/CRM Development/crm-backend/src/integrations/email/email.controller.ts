import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('webhook')
  @UseGuards(new WebhookGuard({}))
  async handleWebhook(@Body() payload: any) {
    await this.emailService.receiveMessage(payload);
    return { status: 'ok' };
  }
}

