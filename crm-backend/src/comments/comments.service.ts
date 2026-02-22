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

  private readonly MAX_PINNED_NOTES = 3;

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
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
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
        content: comment.content,
        commentType: comment.type,
      },
    });

    // If this is an INTERNAL_NOTE (pinned note), check if we need to unpin old ones
    if (comment.type === 'INTERNAL_NOTE' && comment.dealId) {
      await this.unpinOldNotesIfNeeded(comment.dealId, userId);
    }

    // Emit WebSocket event
    this.websocketGateway.emitCommentCreated(comment);

    return comment;
  }

  /**
   * Unpins oldest notes if there are more than MAX_PINNED_NOTES
   */
  private async unpinOldNotesIfNeeded(dealId: string, userId: string): Promise<void> {
    // Get all pinned notes for this deal, ordered by creation date (oldest first)
    const pinnedNotes = await this.prisma.comment.findMany({
      where: {
        dealId,
        type: 'INTERNAL_NOTE',
      },
      orderBy: { createdAt: 'asc' },
    });

    // If we have more than MAX_PINNED_NOTES, unpin the oldest ones
    if (pinnedNotes.length > this.MAX_PINNED_NOTES) {
      const notesToUnpin = pinnedNotes.slice(0, pinnedNotes.length - this.MAX_PINNED_NOTES);

      for (const note of notesToUnpin) {
        // Update comment type to COMMENT
        await this.prisma.comment.update({
          where: { id: note.id },
          data: { type: 'COMMENT' },
        });

        // Update the activity payload
        const activity = await this.prisma.activity.findFirst({
          where: {
            type: 'COMMENT_ADDED',
            payload: {
              path: ['commentId'],
              equals: note.id,
            },
          },
        });

        if (activity) {
          await this.prisma.activity.update({
            where: { id: activity.id },
            data: {
              payload: {
                ...(activity.payload as object),
                commentType: 'COMMENT',
              },
            },
          });
        }
      }
    }
  }

  async findByDeal(dealId: string) {
    return this.prisma.comment.findMany({
      where: { dealId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByContact(contactId: string) {
    return this.prisma.comment.findMany({
      where: { contactId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateType(id: string, type: 'COMMENT' | 'INTERNAL_NOTE' | 'CLIENT_MESSAGE', userId: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    const oldType = comment.type;

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: { type },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Update the activity payload to reflect the new type
    // Find the original COMMENT_ADDED activity and update it
    const activity = await this.prisma.activity.findFirst({
      where: {
        type: 'COMMENT_ADDED',
        payload: {
          path: ['commentId'],
          equals: id,
        },
      },
    });

    if (activity) {
      await this.prisma.activity.update({
        where: { id: activity.id },
        data: {
          payload: {
            ...(activity.payload as object),
            commentType: type,
          },
        },
      });
    }

    return updatedComment;
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






