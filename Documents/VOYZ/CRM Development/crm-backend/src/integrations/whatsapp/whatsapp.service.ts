import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseIntegration } from '../common/base.integration';
import {
  IntegrationServiceInterface,
  SendMessageOptions,
  ParsedMessage,
  IntegrationFeatures,
  IntegrationConfig,
} from '../common/integration.interface';
import { IntegrationType, MessageDirection } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WhatsAppService extends BaseIntegration implements IntegrationServiceInterface {
  private apiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;

  constructor(prismaService: PrismaService) {
    super(IntegrationType.WHATSAPP, prismaService);
  }

  async initialize(config: IntegrationConfig): Promise<void> {
    await super.initialize(config);
    this.apiUrl = `https://graph.facebook.com/v18.0/${config.credentials.phoneNumberId}`;
    this.accessToken = config.credentials.accessToken;
    this.phoneNumberId = config.credentials.phoneNumberId;
    this.webhookVerifyToken = config.credentials.webhookVerifyToken || 'default_verify_token';
  }

  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: options.recipient,
          type: 'text',
          text: { body: options.content },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data.messages[0]?.id;

      // Save message to database
      if (messageId && options.dealId) {
        await this.saveMessage(
          {
            externalMessageId: messageId,
            sender: this.phoneNumberId,
            recipient: options.recipient,
            content: options.content,
            direction: MessageDirection.OUTGOING,
            attachments: options.attachments,
            metadata: options.metadata,
          },
          options.dealId,
        );
      }

      return { success: true, messageId };
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', error);
      return { success: false, error: error.message };
    }
  }

  async receiveMessage(payload: any): Promise<ParsedMessage | null> {
    const parsed = this.parseIncomingMessage(payload);
    if (!parsed) return null;

    // Save to database
    const dealId = await this.findDealByContact(parsed.sender);
    const messageId = await this.saveMessage(parsed, dealId);

    // Create activity log
    if (dealId) {
      await this.createActivity('message_received', dealId, null, {
        integrationType: IntegrationType.WHATSAPP,
        messageId,
      });
    }

    return parsed;
  }

  parseIncomingMessage(rawPayload: any): ParsedMessage | null {
    try {
      const entry = rawPayload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) return null;

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      return {
        externalMessageId: message.id,
        sender: message.from,
        recipient: this.phoneNumberId,
        content: message.text?.body || message.caption || '',
        direction: MessageDirection.INCOMING,
        attachments: message.image || message.document || message.audio || message.video
          ? [{ type: 'image', url: message.image?.url || message.document?.url }]
          : undefined,
        metadata: {
          contactName: contact?.profile?.name,
          messageType: message.type,
          timestamp: message.timestamp,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse WhatsApp message', error);
      return null;
    }
  }

  async validateWebhook(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean> {
    // WhatsApp webhook verification
    const mode = payload.hub?.mode;
    const token = payload.hub?.verify_token;
    const challenge = payload.hub?.challenge;

    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return true;
    }

    // For actual webhooks, validate signature
    if (signature && headers?.['x-hub-signature-256']) {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookVerifyToken)
        .update(JSON.stringify(payload))
        .digest('hex');
      return `sha256=${expectedSignature}` === headers['x-hub-signature-256'];
    }

    return false;
  }

  availableFeatures(): IntegrationFeatures {
    return {
      sendMessage: true,
      receiveMessage: true,
      attachments: true,
      readReceipts: true,
      typingIndicator: true,
      groupChats: false,
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      const response = await axios.get(`${this.apiUrl}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return { status: response.status === 200 ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

