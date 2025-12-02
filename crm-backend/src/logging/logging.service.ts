import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { Log } from '@prisma/client';

@Injectable()
export class LoggingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(logData: {
    level: string;
    action: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    message: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Log> {
    return this.prisma.log.create({
      data: logData,
    });
  }

  async findAll(filters?: {
    level?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.level) where.level = filters.level;
    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await this.prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent huge queries
    });

    // Fetch user information for logs that have userId
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    // Map logs with user information
    return logs.map(log => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) || null : null,
    }));
  }
}






