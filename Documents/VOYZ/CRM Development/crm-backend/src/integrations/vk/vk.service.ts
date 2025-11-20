import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseIntegration } from '../common/base.integration';
import { IntegrationType, MessageDirection } from '@prisma/client';
import { ParsedMessage, SendMessageOptions } from '../common/integration.interface';
import axios from 'axios';

@Injectable()
export class VkService extends BaseIntegration {
  private accessToken: string;
  private apiVersion: string = '5.131';

  constructor(prismaService: PrismaService) {
    super(IntegrationType.VK, prismaService);
  }

  async initialize(config: any): Promise<void> {
    await super.initialize(config);
    this.accessToken = config.credentials.accessToken;
  }

  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post('https://api.vk.com/method/messages.send', {
        user_id: options.recipient,
        message: options.content,
        access_token: this.accessToken,
        v: this.apiVersion,
      });

      return { success: true, messageId: response.data.response?.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async receiveMessage(payload: any): Promise<ParsedMessage | null> {
    return this.parseIncomingMessage(payload);
  }

  parseIncomingMessage(rawPayload: any): ParsedMessage | null {
    const message = rawPayload.object?.message;
    if (!message) return null;

    return {
      externalMessageId: message.id.toString(),
      sender: message.from_id.toString(),
      recipient: message.peer_id.toString(),
      content: message.text || '',
      direction: MessageDirection.INCOMING,
    };
  }

  async validateWebhook(payload: any): Promise<boolean> {
    // VK uses secret key validation
    return payload.secret === process.env.VK_SECRET_KEY;
  }
}

