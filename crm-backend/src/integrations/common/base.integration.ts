import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import {
  IntegrationServiceInterface,
  SendMessageOptions,
  IncomingMessagePayload,
  ParsedMessage,
  IntegrationFeatures,
  IntegrationConfig,
  Attachment,
} from './integration.interface';
import { IntegrationType, MessageDirection } from '@prisma/client';

@Injectable()
export abstract class BaseIntegration implements IntegrationServiceInterface {
  protected readonly logger: Logger;
  protected config: IntegrationConfig;
  protected prisma: PrismaService;

  constructor(
    protected readonly integrationType: IntegrationType,
    protected readonly prismaService: PrismaService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.prisma = prismaService;
  }

  /**
   * Initialize integration with configuration
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config;
    this.logger.log(`Initialized ${this.integrationType} integration`);
  }

  /**
   * Abstract method - must be implemented by each integration
   */
  abstract sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Abstract method - must be implemented by each integration
   */
  abstract receiveMessage(payload: any): Promise<ParsedMessage | null>;

  /**
   * Abstract method - must be implemented by each integration
   */
  abstract parseIncomingMessage(rawPayload: any): ParsedMessage | null;

  /**
   * Abstract method - must be implemented by each integration
   */
  abstract validateWebhook(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean>;

  /**
   * Default implementation - can be overridden
   */
  async linkMessageToDeal(messageId: string, dealId: string): Promise<boolean> {
    try {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { dealId },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to link message ${messageId} to deal ${dealId}`, error);
      return false;
    }
  }

  /**
   * Default implementation - can be overridden
   */
  availableFeatures(): IntegrationFeatures {
    return {
      sendMessage: true,
      receiveMessage: true,
      attachments: false,
      readReceipts: false,
      typingIndicator: false,
      groupChats: false,
    };
  }

  /**
   * Default health check - can be overridden
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    return {
      status: this.config?.enabled ? 'healthy' : 'unhealthy',
      message: this.config?.enabled ? undefined : 'Integration is disabled',
    };
  }

  /**
   * Save message to database
   */
  protected async saveMessage(
    parsedMessage: ParsedMessage,
    dealId?: string,
    userId?: string,
  ): Promise<string> {
    const message = await this.prisma.message.create({
      data: {
        externalMessageId: parsedMessage.externalMessageId,
        integrationType: this.integrationType,
        direction: parsedMessage.direction,
        sender: parsedMessage.sender,
        recipient: parsedMessage.recipient,
        content: parsedMessage.content,
        attachments: parsedMessage.attachments ? JSON.parse(JSON.stringify(parsedMessage.attachments)) : null,
        metadata: parsedMessage.metadata ? JSON.parse(JSON.stringify(parsedMessage.metadata)) : null,
        dealId,
        userId,
      },
    });

    return message.id;
  }

  /**
   * Find deal by phone/email/etc.
   */
  protected async findDealByContact(contact: string): Promise<string | null> {
    // Try to find deal by phone number or email in custom fields
    const deal = await this.prisma.deal.findFirst({
      where: {
        OR: [
          { customFields: { path: ['phone'], equals: contact } },
          { customFields: { path: ['email'], equals: contact } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    return deal?.id || null;
  }

  /**
   * Create activity log entry
   */
  protected async createActivity(
    type: string,
    dealId: string | null,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!dealId) return;

    await this.prisma.activity.create({
      data: {
        type,
        dealId,
        userId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  }
}

