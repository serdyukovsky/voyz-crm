import { IntegrationType, MessageDirection } from '@prisma/client';
import { Attachment } from './integration.interface';

export interface UniversalMessage {
  id?: string;
  dealId?: string;
  externalMessageId: string;
  integrationType: IntegrationType;
  direction: MessageDirection;
  sender: string;
  recipient: string;
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MessageCreateDto {
  dealId?: string;
  externalMessageId: string;
  integrationType: IntegrationType;
  direction: MessageDirection;
  sender: string;
  recipient: string;
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface MessageUpdateDto {
  dealId?: string;
  content?: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

