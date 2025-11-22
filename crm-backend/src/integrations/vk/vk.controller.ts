import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VkService } from './vk.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/vk')
export class VkController {
  constructor(private readonly vkService: VkService) {}

  @Post('webhook')
  @UseGuards(
    new WebhookGuard({
      validateSignature: async (payload) => {
        if (!this.vkService) {
          return false;
        }
        return await this.vkService.validateWebhook(payload);
      },
    }),
  )
  async handleWebhook(@Body() payload: any) {
    if (payload.type === 'confirmation') {
      return process.env.VK_CONFIRMATION_CODE;
    }
    await this.vkService.receiveMessage(payload);
    return { status: 'ok' };
  }
}

