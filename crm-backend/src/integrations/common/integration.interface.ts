import { MessageDirection, IntegrationType } from '@prisma/client';

export interface SendMessageOptions {
  recipient: string;
  content: string;
  attachments?: Attachment[];
  dealId?: string;
  metadata?: Record<string, any>;
}

export interface Attachment {
  type: 'image' | 'document' | 'audio' | 'video' | 'file';
  url?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  data?: Buffer;
}

export interface IncomingMessagePayload {
  integrationType: IntegrationType;
  externalMessageId: string;
  sender: string;
  recipient: string;
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ParsedMessage {
  externalMessageId: string;
  sender: string;
  recipient: string;
  content: string;
  attachments?: Attachment[];
  direction: MessageDirection;
  metadata?: Record<string, any>;
}

export interface IntegrationFeatures {
  sendMessage: boolean;
  receiveMessage: boolean;
  attachments: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  groupChats: boolean;
}

export interface IntegrationServiceInterface {
  /**
   * Send a message through the integration
   */
  sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;

  /**
   * Process incoming message from webhook
   */
  receiveMessage(payload: any): Promise<ParsedMessage | null>;

  /**
   * Parse raw webhook payload into standardized format
   */
  parseIncomingMessage(rawPayload: any): ParsedMessage | null;

  /**
   * Link message to deal by phone/email/etc.
   */
  linkMessageToDeal(messageId: string, dealId: string): Promise<boolean>;

  /**
   * Get available features for this integration
   */
  availableFeatures(): IntegrationFeatures;

  /**
   * Validate webhook signature/authenticity
   */
  validateWebhook(payload: any, signature?: string, headers?: Record<string, string>): Promise<boolean>;

  /**
   * Health check for integration
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>;

  /**
   * Initialize integration with configuration
   */
  initialize(config: IntegrationConfig): Promise<void>;
}

export interface IntegrationConfig {
  type: IntegrationType;
  enabled: boolean;
  credentials: Record<string, any>;
  webhookUrl?: string;
  config?: Record<string, any>;
}

