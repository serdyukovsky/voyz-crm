import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseIntegration } from '../common/base.integration';
import { IntegrationType, MessageDirection } from '@prisma/client';
import { ParsedMessage, SendMessageOptions } from '../common/integration.interface';
import axios from 'axios';

@Injectable()
export class TelegramService extends BaseIntegration {
  private botToken: string;
  private apiUrl: string;

  constructor(prismaService: PrismaService) {
    super(IntegrationType.TELEGRAM, prismaService);
  }

  async initialize(config: any): Promise<void> {
    await super.initialize(config);
    this.botToken = config.credentials.botToken;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: options.recipient,
        text: options.content,
      });

      return { success: true, messageId: response.data.result.message_id.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async receiveMessage(payload: any): Promise<ParsedMessage | null> {
    return this.parseIncomingMessage(payload);
  }

  parseIncomingMessage(rawPayload: any): ParsedMessage | null {
    const message = rawPayload.message;
    if (!message) return null;

    return {
      externalMessageId: message.message_id.toString(),
      sender: message.from.id.toString(),
      recipient: message.chat.id.toString(),
      content: message.text || '',
      direction: MessageDirection.INCOMING,
      metadata: { chatType: message.chat.type },
    };
  }

  async validateWebhook(): Promise<boolean> {
    return true; // Telegram uses secret token in URL
  }
}

