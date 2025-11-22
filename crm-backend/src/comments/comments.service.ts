import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { Comment } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly websocketGateway: RealtimeGateway,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        type: createCommentDto.type,
        dealId: createCommentDto.dealId,
        taskId: createCommentDto.taskId,
        contactId: createCommentDto.contactId,
        userId,
      },
      include: {
        user: true,
      },
    });

    // Log activity
    await this.activityService.create({
      type: 'COMMENT_ADDED',
      userId,
      dealId: comment.dealId || undefined,
      taskId: comment.taskId || undefined,
      contactId: comment.contactId || undefined,
      payload: {
        commentId: comment.id,
      },
    });

    // Emit WebSocket event
    this.websocketGateway.emitCommentCreated(comment);

    return comment;
  }

  async findByDeal(dealId: string) {
    return this.prisma.comment.findMany({
      where: { dealId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByContact(contactId: string) {
    return this.prisma.comment.findMany({
      where: { contactId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    await this.prisma.comment.delete({
      where: { id },
    });
  }
}

