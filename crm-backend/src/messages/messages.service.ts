import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { WsGateway } from '@/ws/ws.gateway';
import { IntegrationType, MessageDirection } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WsGateway,
  ) {}

  async create(data: any) {
    const message = await this.prisma.message.create({
      data,
      include: {
        deal: true,
        user: true,
      },
    });

    // Create activity
    if (message.dealId) {
      await this.prisma.activity.create({
        data: {
          type: 'COMMENT_ADDED', // Using COMMENT_ADDED as closest match for message received
          dealId: message.dealId,
          userId: message.userId || null,
          payload: {
            integrationType: message.integrationType,
            direction: message.direction,
          },
        },
      });
    }

    this.wsGateway.broadcastMessageNew(message);
    return message;
  }

  async findAll(filters?: any) {
    return this.prisma.message.findMany({
      where: filters,
      include: {
        deal: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDeal(dealId: string) {
    return this.prisma.message.findMany({
      where: { dealId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkToDeal(messageId: string, dealId: string) {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { dealId },
    });

    this.wsGateway.broadcastMessageNew(message);
    return message;
  }
}

