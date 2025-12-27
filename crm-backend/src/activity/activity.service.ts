import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { Activity, ActivityType } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    return this.prisma.activity.create({
      data: {
        type: createActivityDto.type,
        dealId: createActivityDto.dealId,
        taskId: createActivityDto.taskId,
        contactId: createActivityDto.contactId,
        userId: createActivityDto.userId,
        payload: createActivityDto.payload || {},
      },
    });
  }

  async findByDeal(dealId: string) {
    const activities = await this.prisma.activity.findMany({
      where: { dealId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform activities to include computed 'name' field for user
    return activities.map(activity => ({
      ...activity,
      user: {
        ...activity.user,
        name: `${activity.user.firstName} ${activity.user.lastName}`.trim() || activity.user.email,
      },
      payload: activity.payload && typeof activity.payload === 'object' && !Array.isArray(activity.payload) 
        ? activity.payload as Record<string, any>
        : undefined,
    }));
  }

  async findByTask(taskId: string) {
    const activities = await this.prisma.activity.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform activities to include computed 'name' field for user
    return activities.map(activity => ({
      ...activity,
      user: {
        ...activity.user,
        name: `${activity.user.firstName} ${activity.user.lastName}`.trim() || activity.user.email,
      },
      payload: activity.payload && typeof activity.payload === 'object' && !Array.isArray(activity.payload) 
        ? activity.payload as Record<string, any>
        : undefined,
    }));
  }

  async findByContact(contactId: string) {
    const activities = await this.prisma.activity.findMany({
      where: { contactId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform activities to include computed 'name' field for user
    return activities.map(activity => ({
      ...activity,
      user: {
        ...activity.user,
        name: `${activity.user.firstName} ${activity.user.lastName}`.trim() || activity.user.email,
      },
      payload: activity.payload && typeof activity.payload === 'object' && !Array.isArray(activity.payload) 
        ? activity.payload as Record<string, any>
        : undefined,
    }));
  }

  async findAll(filters: {
    entityType?: 'deal' | 'contact' | 'company' | 'task';
    entityId?: string;
    type?: ActivityType;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    // Filter by entity type and ID
    if (filters.entityType && filters.entityId) {
      switch (filters.entityType) {
        case 'deal':
          where.dealId = filters.entityId;
          break;
        case 'contact':
          where.contactId = filters.entityId;
          break;
        case 'task':
          where.taskId = filters.entityId;
          break;
        case 'company':
          // For companies, we need to find activities through deals or contacts
          // This requires a more complex query
          where.OR = [
            { deal: { companyId: filters.entityId } },
            { contact: { companyId: filters.entityId } },
          ];
          break;
      }
    }

    // Filter by activity type
    if (filters.type) {
      where.type = filters.type;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const activities = await this.prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // Changed to desc to show latest first
    });

    // Transform activities to include computed 'name' field for user
    const transformed = activities.map(activity => ({
      ...activity,
      user: activity.user ? {
        ...activity.user,
        name: `${activity.user.firstName} ${activity.user.lastName}`.trim() || activity.user.email,
      } : null,
      payload: activity.payload && typeof activity.payload === 'object' && !Array.isArray(activity.payload) 
        ? activity.payload as Record<string, any>
        : undefined,
    }));
    
    return transformed;
  }
}

