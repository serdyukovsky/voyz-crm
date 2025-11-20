import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseIntegration } from '../common/base.integration';
import { IntegrationType, MessageDirection, CallDirection } from '@prisma/client';
import { ParsedMessage, SendMessageOptions } from '../common/integration.interface';

@Injectable()
export class TelephonyService extends BaseIntegration {
  constructor(prismaService: PrismaService) {
    super(IntegrationType.TELEPHONY, prismaService);
  }

  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Telephony doesn't send messages, only calls
    return { success: false, error: 'Telephony integration does not support sending messages' };
  }

  async receiveMessage(payload: any): Promise<ParsedMessage | null> {
    // Telephony receives call events, not messages
    return null;
  }

  parseIncomingMessage(rawPayload: any): ParsedMessage | null {
    return null;
  }

  async validateWebhook(): Promise<boolean> {
    return true;
  }

  /**
   * Process incoming call event
   */
  async processCallEvent(payload: any): Promise<void> {
    const call = await this.prisma.call.create({
      data: {
        externalCallId: payload.callId,
        phone: payload.phone,
        direction: payload.direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
        duration: payload.duration,
        recordingUrl: payload.recordingUrl,
        status: payload.status,
        metadata: payload.metadata,
        dealId: await this.findDealByContact(payload.phone),
      },
    });

    // Create activity log
    if (call.dealId) {
      await this.createActivity('call_received', call.dealId, null, {
        callId: call.id,
        phone: payload.phone,
        duration: payload.duration,
      });
    }

    // If missed call, create task
    if (payload.status === 'missed' && call.dealId) {
      await this.prisma.task.create({
        data: {
          dealId: call.dealId,
          title: `Missed call from ${payload.phone}`,
          status: 'PENDING',
          assignedToId: call.dealId ? (await this.prisma.deal.findUnique({ where: { id: call.dealId } }))?.assignedToId || undefined : undefined,
          createdById: call.dealId ? (await this.prisma.deal.findUnique({ where: { id: call.dealId } }))?.createdById || undefined : undefined,
        },
      });
    }
  }
}

