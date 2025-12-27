import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { Task, TaskStatus, ActivityType } from '@prisma/client';
import { PaginationCursor, PaginatedResponse } from '@/common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly websocketGateway: RealtimeGateway,
    private readonly loggingService: LoggingService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status || TaskStatus.TODO,
        priority: createTaskDto.priority,
        type: createTaskDto.type,
        deadline: createTaskDto.deadline ? new Date(createTaskDto.deadline) : null,
        dealId: createTaskDto.dealId,
        contactId: createTaskDto.contactId,
        assignedToId: createTaskDto.assignedToId,
        createdById: userId,
      },
      include: {
        deal: true,
        contact: true,
        assignedTo: true,
      },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.TASK_CREATED,
      userId,
      taskId: task.id,
      dealId: task.dealId || undefined,
      contactId: task.contactId || undefined,
      payload: {
        taskTitle: task.title,
      },
    });

    // Log action
    try {
      // Use already loaded deal and contact data (optimization: avoid extra queries)
      await this.loggingService.create({
        level: 'info',
        action: 'create',
        entity: 'task',
        entityId: task.id,
        userId,
        message: `Task "${task.title}" created`,
        metadata: {
          taskTitle: task.title,
          status: task.status,
          priority: task.priority,
          dealId: task.dealId,
          dealTitle: task.deal?.title,
          contactId: task.contactId,
          contactName: task.contact?.fullName,
        },
      });
    } catch (logError) {
      console.error('TasksService.create - failed to create log:', logError);
    }

    // Emit WebSocket events
    this.websocketGateway.emitTaskCreated(task.id, task);
    if (task.contactId) {
      this.websocketGateway.emitContactTaskUpdated(task.contactId, task.id, task);
    }

    return task;
  }

  /**
   * Encode cursor to base64 string
   */
  private encodeCursor(cursor: PaginationCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  /**
   * Decode cursor from base64 string
   */
  private decodeCursor(cursorString: string): PaginationCursor | null {
    try {
      const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
      const cursor = JSON.parse(decoded) as PaginationCursor;
      if (!cursor.updatedAt || !cursor.id) {
        return null;
      }
      return cursor;
    } catch (error) {
      return null;
    }
  }

  async findAll(filters?: {
    dealId?: string;
    contactId?: string;
    assignedToId?: string;
    status?: TaskStatus;
    limit?: number;
    cursor?: string; // base64 encoded cursor
  }): Promise<PaginatedResponse<any> | any[]> {
    const where: any = {};

    // Base filters
    if (filters?.dealId) where.dealId = filters.dealId;
    if (filters?.contactId) where.contactId = filters.contactId;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.status) where.status = filters.status;

    // Hard limit for performance (optimization: prevent loading all tasks)
    const limit = filters?.limit ? Math.min(filters.limit, 100) : 50;
    const take = limit + 1; // +1 to check if hasMore

    // Decode cursor if provided (for tasks we use createdAt, but cursor format uses updatedAt field name)
    const decodedCursor = filters?.cursor ? this.decodeCursor(filters.cursor) : null;

    // Add cursor condition for pagination (tasks use createdAt for sorting)
    if (decodedCursor) {
      const cursorCondition = {
        OR: [
          { createdAt: { lt: new Date(decodedCursor.updatedAt) } }, // Note: cursor.updatedAt contains createdAt value for tasks
          {
            createdAt: new Date(decodedCursor.updatedAt),
            id: { lt: decodedCursor.id },
          },
        ],
      };

      // Merge cursor condition into existing where
      Object.assign(where, cursorCondition);
    }

    // Use select instead of include to avoid overfetching (optimization: load only needed fields)
    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        deadline: true,
        completedAt: true,
        result: true,
        dealId: true,
        contactId: true,
        assignedToId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        deal: {
          select: {
            id: true,
            title: true,
            stage: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            position: true,
            companyName: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }, // Secondary sort for stable pagination
      ],
      take,
    });

    // Always return an array, even if empty
    if (tasks.length === 0) {
      // If cursor was provided, return paginated response, otherwise return empty array (backward compatibility)
      if (decodedCursor) {
        return { data: [], nextCursor: undefined, hasMore: false };
      }
      return [];
    }

    // Check if there are more items
    const hasMore = tasks.length > limit;
    const data = hasMore ? tasks.slice(0, limit) : tasks;

    // Format tasks without stats (optimization: stats not needed for list view)
    const formattedTasks = data.map((task) => this.formatTaskResponseForList(task));

    // If cursor was provided, return paginated response
    if (decodedCursor) {
      const lastTask = data[data.length - 1];
      const nextCursor = hasMore
        ? this.encodeCursor({
            updatedAt: lastTask.createdAt.toISOString(), // Use updatedAt field name in cursor, but store createdAt value
            id: lastTask.id,
          })
        : undefined;

      return {
        data: formattedTasks,
        nextCursor,
        hasMore,
      };
    }

    // Backward compatibility: return array if no cursor
    return formattedTasks;
  }

  /**
   * Batch load contact stats for multiple contacts (optimization: avoid N+1 queries)
   */
  private async getContactStatsBatch(contactIds: string[]): Promise<Map<string, any>> {
    if (contactIds.length === 0) {
      return new Map();
    }

    const deals = await this.prisma.deal.findMany({
      where: { contactId: { in: contactIds } },
      select: {
        id: true,
        contactId: true,
        amount: true,
        closedAt: true,
      },
    });

    // Group deals by contactId
    const statsMap = new Map<string, any>();
    
    // Initialize stats for all contacts
    contactIds.forEach(id => {
      statsMap.set(id, {
        activeDeals: 0,
        closedDeals: 0,
        totalDeals: 0,
        totalDealVolume: 0,
      });
    });

    // Calculate stats for each contact
    deals.forEach(deal => {
      if (!deal.contactId) return;
      
      const stats = statsMap.get(deal.contactId);
      if (!stats) return;

      stats.totalDeals++;
      if (deal.closedAt) {
        stats.closedDeals++;
        stats.totalDealVolume += Number(deal.amount);
      } else {
        stats.activeDeals++;
      }
    });

    return statsMap;
  }

  /**
   * Format task response for list view (optimized - no stats)
   */
  private formatTaskResponseForList(task: any) {
    return {
      ...task,
      deal: task.deal ? {
        id: task.deal.id,
        title: task.deal.title,
        stage: task.deal.stage,
      } : null,
      contact: task.contact ? {
        id: task.contact.id,
        fullName: task.contact.fullName,
        email: task.contact.email,
        phone: task.contact.phone,
        position: task.contact.position,
        companyName: task.contact.companyName,
        company: task.contact.company,
      } : null,
      assignedTo: task.assignedTo ? {
        id: task.assignedTo.id,
        name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || 'Unknown User',
        avatar: task.assignedTo.avatar || null,
      } : null,
    };
  }

  private async getContactStats(contactId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { contactId },
      select: {
        id: true,
        amount: true,
        closedAt: true,
      },
    });

    const activeDeals = deals.filter((d) => !d.closedAt);
    const closedDeals = deals.filter((d) => d.closedAt);
    const totalDealVolume = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.amount),
      0,
    );

    return {
      activeDeals: activeDeals.length,
      closedDeals: closedDeals.length,
      totalDeals: deals.length,
      totalDealVolume,
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        dealId: true,
        contactId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        deadline: true,
        completedAt: true,
        result: true,
        createdById: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
        deal: {
          select: {
            id: true,
            title: true,
            stageId: true,
            // Загружаем только базовые поля deal, stage и contact не нужны для детального просмотра задачи
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            position: true,
            companyName: true,
            social: true,
            company: {
              select: {
                id: true,
                name: true,
                industry: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Add contact stats if contact exists
    if (task.contact) {
      const contactStats = await this.getContactStats(task.contact.id);
      return {
        ...task,
        contact: {
          ...task.contact,
          stats: contactStats,
        },
      };
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const existing = await this.findOne(id);

    const updates: any = {};
    const changes: Record<string, { old: any; new: any }> = {};

    if (updateTaskDto.title !== undefined && updateTaskDto.title !== existing.title) {
      updates.title = updateTaskDto.title;
      changes.title = { old: existing.title, new: updateTaskDto.title };
    }

    if (updateTaskDto.description !== undefined && updateTaskDto.description !== existing.description) {
      updates.description = updateTaskDto.description;
      changes.description = { old: existing.description, new: updateTaskDto.description };
    }

    if (updateTaskDto.status !== undefined && updateTaskDto.status !== existing.status) {
      updates.status = updateTaskDto.status;
      changes.status = { old: existing.status, new: updateTaskDto.status };
    }

    if (updateTaskDto.deadline !== undefined) {
      const newDeadline = updateTaskDto.deadline ? new Date(updateTaskDto.deadline) : null;
      if (newDeadline?.getTime() !== existing.deadline?.getTime()) {
        updates.deadline = newDeadline;
        changes.deadline = { old: existing.deadline, new: newDeadline };
      }
    }

    if (updateTaskDto.assignedToId !== undefined && updateTaskDto.assignedToId !== existing.assignedToId) {
      updates.assignedToId = updateTaskDto.assignedToId;
      changes.assignee = { old: existing.assignedToId, new: updateTaskDto.assignedToId };
    }

    if (updateTaskDto.dealId !== undefined && updateTaskDto.dealId !== existing.dealId) {
      updates.dealId = updateTaskDto.dealId || null;
      // Get deal names for better logging
      const oldDeal = existing.dealId ? await this.prisma.deal.findUnique({
        where: { id: existing.dealId },
        select: { title: true },
      }) : null;
      const newDeal = updateTaskDto.dealId ? await this.prisma.deal.findUnique({
        where: { id: updateTaskDto.dealId },
        select: { title: true },
      }) : null;
      changes.dealId = { 
        old: existing.dealId ? (oldDeal?.title || existing.dealId) : null, 
        new: updateTaskDto.dealId ? (newDeal?.title || updateTaskDto.dealId) : null 
      };
    }

    if (updateTaskDto.contactId !== undefined && updateTaskDto.contactId !== existing.contactId) {
      updates.contactId = updateTaskDto.contactId || null;
      // Get contact names for better logging
      const oldContact = existing.contactId ? await this.prisma.contact.findUnique({
        where: { id: existing.contactId },
        select: { fullName: true },
      }) : null;
      const newContact = updateTaskDto.contactId ? await this.prisma.contact.findUnique({
        where: { id: updateTaskDto.contactId },
        select: { fullName: true },
      }) : null;
      changes.contactId = { 
        old: existing.contactId ? (oldContact?.fullName || existing.contactId) : null, 
        new: updateTaskDto.contactId ? (newContact?.fullName || updateTaskDto.contactId) : null 
      };
    }

    if (updateTaskDto.result !== undefined && updateTaskDto.result !== existing.result) {
      updates.result = updateTaskDto.result;
      changes.result = { old: existing.result || null, new: updateTaskDto.result || null };
      if (updateTaskDto.status === TaskStatus.DONE && !existing.completedAt) {
        updates.completedAt = new Date();
      }
    }
    
    const task = await this.prisma.task.update({
      where: { id },
      data: updates,
      include: {
        deal: true,
        contact: true,
        assignedTo: true,
      },
    });

    // Log activity for changes - create activities for each changed field
    for (const [field, change] of Object.entries(changes)) {
      const activityType =
        field === 'status' && change.new === TaskStatus.DONE
          ? ActivityType.TASK_COMPLETED
          : ActivityType.TASK_UPDATED;

      try {
        const activity = await this.activityService.create({
          type: activityType,
          userId,
          taskId: id,
          dealId: task.dealId || undefined,
          contactId: task.contactId || undefined,
          payload: {
            field,
            oldValue: change.old,
            newValue: change.new,
          },
        });
      } catch (activityError) {
        console.error('TasksService.update - Failed to create activity for field:', field, activityError);
      }
    }

    // Log action - only if there are actual changes
    if (Object.keys(changes).length > 0) {
      try {
        const changeFields = Object.keys(changes);
        
        // Use already loaded deal and contact data (optimization: avoid extra queries)
        const logData = {
          level: 'info',
          action: 'update',
          entity: 'task',
          entityId: task.id,
          userId,
          message: `Task "${task.title}" updated: ${changeFields.join(', ')}`,
          metadata: {
            taskTitle: task.title,
            changes,
            status: task.status,
            dealId: task.dealId,
            dealTitle: task.deal?.title,
            contactId: task.contactId,
            contactName: task.contact?.fullName,
          },
        };
        
        await this.loggingService.create(logData);
      } catch (logError) {
        console.error('TasksService.update - failed to create log:', logError);
        console.error('TasksService.update - log error details:', logError instanceof Error ? logError.stack : logError);
      }
    }

    // Emit WebSocket events
    this.websocketGateway.emitTaskUpdated(id, task);
    if (task.contactId) {
      this.websocketGateway.emitContactTaskUpdated(task.contactId, id, task);
    }
    // Also emit if contact changed
    if (updateTaskDto.contactId !== undefined && updateTaskDto.contactId !== existing.contactId) {
      if (existing.contactId) {
        this.websocketGateway.emitContactTaskUpdated(existing.contactId, id, task);
      }
      if (updateTaskDto.contactId) {
        this.websocketGateway.emitContactTaskUpdated(updateTaskDto.contactId, id, task);
      }
    }

    return task;
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);

    await this.prisma.task.delete({
      where: { id },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.TASK_DELETED,
      userId,
      taskId: id,
      payload: {
        taskTitle: task.title,
      },
    });

    // Log action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'delete',
        entity: 'task',
        entityId: id,
        userId,
        message: `Task "${task.title}" deleted`,
        metadata: {
          taskTitle: task.title,
        },
      });
    } catch (logError) {
      console.error('TasksService.remove - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitTaskDeleted(id, { dealId: task.dealId, contactId: task.contactId });
  }

  async getHistory(taskId: string) {
    // Get activities for this task
    const activities = await this.activityService.findAll({
      entityType: 'task',
      entityId: taskId,
    });

    return activities;
  }
}

