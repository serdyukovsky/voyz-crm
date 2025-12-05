import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { Task, TaskStatus, ActivityType } from '@prisma/client';

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
      // Get deal and contact names for metadata
      const deal = task.dealId ? await this.prisma.deal.findUnique({
        where: { id: task.dealId },
        select: { title: true },
      }) : null;
      const contact = task.contactId ? await this.prisma.contact.findUnique({
        where: { id: task.contactId },
        select: { fullName: true },
      }) : null;
      
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
          dealTitle: deal?.title,
          contactId: task.contactId,
          contactName: contact?.fullName,
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

  async findAll(filters?: {
    dealId?: string;
    contactId?: string;
    assignedToId?: string;
    status?: TaskStatus;
  }) {
    const tasks = await this.prisma.task.findMany({
      where: filters,
      include: {
        deal: {
          include: {
            stage: true,
            contact: true,
          },
        },
        contact: {
          include: {
            company: true,
          },
        },
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format tasks with contact stats if contact exists
    return Promise.all(
      tasks.map(async (task) => {
        if (!task.contact) {
          return task;
        }

        // Get contact stats
        const contactStats = await this.getContactStats(task.contact.id);

        return {
          ...task,
          contact: {
            id: task.contact.id,
            fullName: task.contact.fullName,
            email: task.contact.email,
            phone: task.contact.phone,
            position: task.contact.position,
            companyName: task.contact.company?.name,
            company: task.contact.company,
            social: task.contact.social as {
              instagram?: string;
              telegram?: string;
              whatsapp?: string;
              vk?: string;
            },
            stats: contactStats,
          },
        };
      }),
    );
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
      include: {
        deal: {
          include: {
            stage: true,
            contact: true,
          },
        },
        contact: {
          include: {
            company: true,
          },
        },
        assignedTo: true,
        createdBy: true,
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
          id: task.contact.id,
          fullName: task.contact.fullName,
          email: task.contact.email,
          phone: task.contact.phone,
          position: task.contact.position,
          companyName: task.contact.companyName,
          company: task.contact.company,
          social: task.contact.social as {
            instagram?: string;
            telegram?: string;
            whatsapp?: string;
            vk?: string;
          },
          stats: contactStats,
        },
      };
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    console.log('TasksService.update - Called with:', { id, updateTaskDto, userId });
    const existing = await this.findOne(id);
    console.log('TasksService.update - Existing task:', existing.id, existing.title);

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

    console.log('TasksService.update - Updates to apply:', updates);
    console.log('TasksService.update - Changes detected:', Object.keys(changes));
    
    const task = await this.prisma.task.update({
      where: { id },
      data: updates,
      include: {
        deal: true,
        contact: true,
        assignedTo: true,
      },
    });

    console.log('TasksService.update - Task updated successfully:', task.id);

    // Log activity for changes - create activities for each changed field
    console.log('TasksService.update - Creating activities for changes:', Object.keys(changes));
    for (const [field, change] of Object.entries(changes)) {
      console.log('TasksService.update - Logging activity for field:', field, 'Change:', change);
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
        console.log('TasksService.update - Activity created successfully:', activity.id, 'Type:', activity.type, 'Field:', field);
      } catch (activityError) {
        console.error('TasksService.update - Failed to create activity for field:', field, activityError);
      }
    }
    console.log('TasksService.update - All activities created for task:', id);

    // Log action - only if there are actual changes
    if (Object.keys(changes).length > 0) {
      try {
        const changeFields = Object.keys(changes);
        console.log('TasksService.update - Creating log for task:', task.id, 'Changes:', changeFields, 'UserId:', userId);
        
        // Get deal and contact names for metadata
        const deal = task.dealId ? await this.prisma.deal.findUnique({
          where: { id: task.dealId },
          select: { title: true },
        }) : null;
        const contact = task.contactId ? await this.prisma.contact.findUnique({
          where: { id: task.contactId },
          select: { fullName: true },
        }) : null;
        
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
            dealTitle: deal?.title,
            contactId: task.contactId,
            contactName: contact?.fullName,
          },
        };
        
        console.log('TasksService.update - Log data:', JSON.stringify(logData, null, 2));
        const createdLog = await this.loggingService.create(logData);
        console.log('TasksService.update - Log created successfully:', createdLog.id, 'Entity:', createdLog.entity, 'EntityId:', createdLog.entityId);
      } catch (logError) {
        console.error('TasksService.update - failed to create log:', logError);
        console.error('TasksService.update - log error details:', logError instanceof Error ? logError.stack : logError);
      }
    } else {
      console.log('TasksService.update - No changes detected, skipping log creation');
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

