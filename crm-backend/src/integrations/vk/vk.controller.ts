import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VkService } from './vk.service';
import { WebhookGuard } from '../common/webhook.guard';

@Controller('integrations/vk')
export class VkController {
  constructor(private readonly vkService: VkService) {}

  private async validateWebhookSignature(payload: any): Promise<boolean> {
    return await this.vkService.validateWebhook(payload);
  }

  @Post('webhook')
  @UseGuards(
    new WebhookGuard({
      validateSignature: (payload: any) => {
        const controller = this as VkController;
        return controller.validateWebhookSignature(payload);
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

