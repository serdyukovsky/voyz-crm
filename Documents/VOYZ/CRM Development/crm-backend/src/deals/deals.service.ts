import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { WsGateway } from '@/ws/ws.gateway';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WsGateway,
  ) {}

  async create(data: any, userId: string) {
    const deal = await this.prisma.deal.create({
      data: {
        ...data,
        createdById: userId,
      },
      include: {
        stage: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Create activity
    await this.prisma.activity.create({
      data: {
        type: 'deal_created',
        dealId: deal.id,
        userId,
      },
    });

    this.wsGateway.broadcastDealUpdate(deal);
    return deal;
  }

  async findAll(filters?: any) {
    return this.prisma.deal.findMany({
      where: filters,
      include: {
        stage: true,
        createdBy: true,
        assignedTo: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        createdBy: true,
        assignedTo: true,
        tasks: true,
        comments: true,
        activities: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
        },
        calls: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, data: any, userId: string) {
    const oldDeal = await this.prisma.deal.findUnique({ where: { id } });
    const deal = await this.prisma.deal.update({
      where: { id },
      data,
      include: {
        stage: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Create activity for changes
    if (oldDeal.stageId !== deal.stageId) {
      await this.prisma.activity.create({
        data: {
          type: 'stage_change',
          dealId: deal.id,
          userId,
          metadata: {
            fromStage: oldDeal.stageId,
            toStage: deal.stageId,
          },
        },
      });
    }

    this.wsGateway.broadcastDealUpdate(deal);
    return deal;
  }

  async remove(id: string) {
    return this.prisma.deal.delete({
      where: { id },
    });
  }
}

