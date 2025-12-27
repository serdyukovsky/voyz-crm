import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { IntegrationType, MessageDirection } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway)) private readonly websocketGateway: RealtimeGateway,
  ) {
    if (!this.prisma) {
      console.error('❌ PrismaService is not injected in ChatService constructor!')
      throw new Error('PrismaService injection failed')
    }
  }

  /**
   * Get or create a thread between users
   * If dealId or taskId is provided, finds or creates a thread linked to that entity
   */
  async getOrCreateThread(
    userId: string,
    dto: CreateThreadDto,
  ) {
    if (!this.prisma) {
      console.error('PrismaService is not injected!')
      throw new Error('Database service not available')
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // If dealId or taskId is provided, try to find existing thread
    if (dto.dealId || dto.taskId) {
      const existingThread = await this.prisma.chatThread.findFirst({
        where: {
          ...(dto.dealId && { dealId: dto.dealId }),
          ...(dto.taskId && { taskId: dto.taskId }),
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
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
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
              number: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (existingThread) {
        return this.formatThreadResponse(existingThread);
      }
    }

    // Create new thread
    const allParticipantIds = [...new Set([userId, ...(dto.participantIds || [])])];
    
    if (allParticipantIds.length === 0) {
      throw new Error('At least one participant is required')
    }
    
    const thread = await this.prisma.chatThread.create({
      data: {
        dealId: dto.dealId || null,
        taskId: dto.taskId || null,
        title: dto.title || null,
        participants: {
          create: allParticipantIds.map((participantId) => ({
            userId: participantId,
          })),
        },
      },
      include: {
        participants: {
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
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            number: true,
          },
        },
      },
    });

    return this.formatThreadResponse(thread);
  }

  /**
   * Get all threads for a user
   */
  async getUserThreads(userId: string) {
    try {
      if (!this.prisma) {
        console.error('❌ PrismaService is undefined in getUserThreads!')
        throw new Error('Database service not available')
      }
      const threads = await this.prisma.chatThread.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
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
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
              number: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return threads.map((thread) => {
        try {
          return this.formatThreadResponse(thread);
        } catch (error) {
          console.error('Error formatting thread:', error, thread);
          return null;
        }
      }).filter((t) => t !== null);
    } catch (error) {
      console.error('Error in getUserThreads:', error);
      throw error;
    }
  }

  /**
   * Get a specific thread with messages
   */
  async getThread(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
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
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            number: true,
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            deal: {
              select: {
                id: true,
                title: true,
                number: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // Mark messages as read
    // NOTE: internalMessage model was removed, using Message instead
    // TODO: Implement message read status using Message model
    // await this.prisma.internalMessage.updateMany({
    //   where: {
    //     threadId: threadId,
    //     recipientId: userId,
    //     isRead: false,
    //   },
    //   data: {
    //     isRead: true,
    //     readAt: new Date(),
    //   },
    // });

    return this.formatThreadResponse(thread);
  }

  /**
   * Send a message in a thread
   */
  async sendMessage(threadId: string, userId: string, dto: SendMessageDto) {
    // Verify user is a participant
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found or you are not a participant');
    }

    // Determine recipient (for direct messages)
    let recipientId: string | null = null;
    if (dto.recipientId) {
      const isParticipant = thread.participants.some(
        (p) => p.userId === dto.recipientId,
      );
      if (!isParticipant) {
        throw new ForbiddenException('Recipient is not a participant in this thread');
      }
      recipientId = dto.recipientId;
    } else if (thread.participants.length === 2) {
      // Direct message - find the other participant
      const otherParticipant = thread.participants.find(
        (p) => p.userId !== userId,
      );
      if (otherParticipant) {
        recipientId = otherParticipant.userId;
      }
    }

    // NOTE: internalMessage model was removed, using Message instead
    // Get user email for sender
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    const senderEmail = user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || userId;
    
    const recipient = recipientId ? await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    }) : null;
    const recipientEmail = recipient?.email || recipientId || '';
    
    const message = await this.prisma.message.create({
      data: {
        threadId: threadId,
        userId: userId,
        sender: senderEmail,
        recipient: recipientEmail,
        content: dto.content,
        externalMessageId: `internal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        integrationType: IntegrationType.EMAIL,
        direction: MessageDirection.OUTGOING,
        dealId: dto.dealId || thread.dealId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            number: true,
          },
        },
      },
    });

    // Update thread's updatedAt
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Emit WebSocket event
    this.websocketGateway.emitChatMessage(threadId, this.formatMessageResponse(message));

    return this.formatMessageResponse(message);
  }

  /**
   * Format thread response
   */
  private formatThreadResponse(thread: any) {
    if (!thread) {
      return null;
    }

    try {
      const participants = (thread.participants || []).map((p: any) => {
        if (!p) return null;
        const userId = p.user?.id || p.id;
        if (!userId) return null;
        
        const firstName = p.user?.firstName || '';
        const lastName = p.user?.lastName || '';
        const email = p.user?.email || p.email || '';
        const name = firstName || lastName 
          ? `${firstName} ${lastName}`.trim() 
          : email || 'User';

        return {
          id: userId,
          name: name,
          email: email,
          avatar: p.user?.avatar || p.avatar || null,
          joinedAt: p.joinedAt || null,
          lastReadAt: p.lastReadAt || null,
        };
      }).filter((p: any) => p !== null);

      const messages = (thread.messages || []).map((m: any) => {
        try {
          return this.formatMessageResponse(m);
        } catch (error) {
          console.error('Error formatting message:', error, m);
          return null;
        }
      }).filter((m: any) => m !== null);

      return {
        id: thread.id,
        title: thread.title || null,
        dealId: thread.dealId || null,
        deal: thread.deal
          ? {
              id: thread.deal.id,
              title: thread.deal.title || '',
              number: thread.deal.number || '',
            }
          : null,
        taskId: thread.taskId || null,
        task: thread.task
          ? {
              id: thread.task.id,
              title: thread.task.title || '',
            }
          : null,
        participants: participants,
        messages: messages,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
        unreadCount: thread._count?.messages || 0,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      };
    } catch (error) {
      console.error('Error in formatThreadResponse:', error, thread);
      throw error;
    }
  }

  /**
   * Format message response
   */
  private formatMessageResponse(message: any) {
    if (!message || !message.sender) {
      return null;
    }
    return {
      id: message.id,
      threadId: message.threadId,
      content: message.content || '',
      sender: {
        id: message.sender.id,
        name: `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() || message.sender.email || 'User',
        avatar: message.sender.avatar,
      },
      recipient: message.recipient
        ? {
            id: message.recipient.id,
            name: `${message.recipient.firstName} ${message.recipient.lastName}`,
            avatar: message.recipient.avatar,
          }
        : null,
      dealId: message.dealId,
      deal: message.deal
        ? {
            id: message.deal.id,
            title: message.deal.title,
            number: message.deal.number,
          }
        : null,
      taskId: message.taskId,
      task: message.task
        ? {
            id: message.task.id,
            title: message.task.title,
          }
        : null,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
