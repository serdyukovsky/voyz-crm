import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { IntegrationType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDealMetrics(filters?: { userId?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (filters?.userId) {
      where.assignedToId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, won, lost, inProgress] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.count({ where: { ...where, stage: { isClosed: true, name: { contains: 'Won' } } } }),
      this.prisma.deal.count({ where: { ...where, stage: { isClosed: true, name: { contains: 'Lost' } } } }),
      this.prisma.deal.count({ where: { ...where, stage: { isClosed: false } } }),
    ]);

    return { total, won, lost, inProgress, conversionRate: total > 0 ? (won / total) * 100 : 0 };
  }

  async getMessageMetrics(filters?: { integrationType?: IntegrationType; startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (filters?.integrationType) {
      where.integrationType = filters.integrationType;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [incoming, outgoing] = await Promise.all([
      this.prisma.message.count({ where: { ...where, direction: 'INCOMING' } }),
      this.prisma.message.count({ where: { ...where, direction: 'OUTGOING' } }),
    ]);

    return { incoming, outgoing, total: incoming + outgoing };
  }

  async getCallMetrics(filters?: { startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, answered, missed] = await Promise.all([
      this.prisma.call.count({ where }),
      this.prisma.call.count({ where: { ...where, status: 'answered' } }),
      this.prisma.call.count({ where: { ...where, status: 'missed' } }),
    ]);

    const avgDuration = await this.prisma.call.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: { duration: true },
    });

    return {
      total,
      answered,
      missed,
      answerRate: total > 0 ? (answered / total) * 100 : 0,
      avgDuration: avgDuration._avg.duration || 0,
    };
  }

  async getChannelPerformance(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const channels = await this.prisma.message.groupBy({
      by: ['integrationType'],
      where,
      _count: { id: true },
    });

    return channels.map((ch) => ({
      channel: ch.integrationType,
      messageCount: ch._count.id,
    }));
  }
}

