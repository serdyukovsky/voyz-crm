import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { Task, TaskStatus, ActivityType } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly websocketGateway: RealtimeGateway,
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
    const existing = await this.findOne(id);

    const updates: any = {};
    const changes: Record<string, { old: any; new: any }> = {};

    if (updateTaskDto.title !== undefined && updateTaskDto.title !== existing.title) {
      updates.title = updateTaskDto.title;
      changes.title = { old: existing.title, new: updateTaskDto.title };
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

    if (updateTaskDto.result !== undefined) {
      updates.result = updateTaskDto.result;
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

    // Log activity for changes
    for (const [field, change] of Object.entries(changes)) {
      const activityType =
        field === 'status' && change.new === TaskStatus.DONE
          ? ActivityType.TASK_COMPLETED
          : ActivityType.TASK_UPDATED;

      await this.activityService.create({
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

    // Emit WebSocket event
    this.websocketGateway.emitTaskDeleted(id, { dealId: task.dealId, contactId: task.contactId });
  }
}

