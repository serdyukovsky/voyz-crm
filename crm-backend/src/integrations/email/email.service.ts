import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { BaseIntegration } from '../common/base.integration';
import { IntegrationType, MessageDirection } from '@prisma/client';
import { ParsedMessage, SendMessageOptions } from '../common/integration.interface';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';

@Injectable()
export class EmailService extends BaseIntegration {
  private transporter: nodemailer.Transporter;
  private imap: Imap;

  constructor(prismaService: PrismaService) {
    super(IntegrationType.EMAIL, prismaService);
  }

  async initialize(config: any): Promise<void> {
    await super.initialize(config);
    this.transporter = nodemailer.createTransport({
      host: config.credentials.smtpHost,
      port: config.credentials.smtpPort,
      secure: config.credentials.smtpSecure,
      auth: {
        user: config.credentials.smtpUser,
        pass: config.credentials.smtpPassword,
      },
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporterOptions = this.transporter.options as any;
      const fromEmail = transporterOptions?.auth?.user || options.metadata?.from || 'noreply@crm.local';
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: options.recipient,
        subject: options.metadata?.subject || 'Message from CRM',
        text: options.content,
        html: options.content,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async receiveMessage(payload: any): Promise<ParsedMessage | null> {
    return this.parseIncomingMessage(payload);
  }

  parseIncomingMessage(rawPayload: any): ParsedMessage | null {
    // Parse email from webhook or IMAP
    return {
      externalMessageId: rawPayload.messageId || rawPayload.id,
      sender: rawPayload.from?.value?.[0]?.address || rawPayload.from,
      recipient: rawPayload.to?.value?.[0]?.address || rawPayload.to,
      content: rawPayload.text || rawPayload.html || '',
      direction: MessageDirection.INCOMING,
      attachments: rawPayload.attachments,
    };
  }

  async validateWebhook(): Promise<boolean> {
    return true; // Email webhooks vary by provider
  }
}

