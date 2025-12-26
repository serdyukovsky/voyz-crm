import { Controller, Post, Get, Body, Query, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  private async validateWebhookSignature(payload: any, signature: string, headers: Record<string, string>): Promise<boolean> {
    return await this.whatsappService.validateWebhook(payload, signature, headers);
  }

  @Get('webhook')
  @HttpCode(200)
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    // WhatsApp webhook verification
    if (mode === 'subscribe' && token === 'your_verify_token') {
      return challenge;
    }
    return 'Forbidden';
  }

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(
    new WebhookGuard({
      validateSignature: (payload: any, signature: string, headers: Record<string, string>) => {
        const controller = this as WhatsAppController;
        return controller.validateWebhookSignature(payload, signature, headers);
      },
    }),
  )
  async handleWebhook(@Body() payload: any, @Headers() headers: Record<string, string>) {
    await this.whatsappService.receiveMessage(payload);
    return { status: 'ok' };
  }
}

