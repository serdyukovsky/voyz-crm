import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const payload = await this.jwtService.verifyAsync(token);
        client.data.userId = payload.sub;
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup
  }

  // Deal events
  emitDealUpdated(dealId: string, data: any) {
    this.server.to(`deal:${dealId}`).emit('deal.updated', { dealId, ...data });
    this.server.emit('deal.updated', { dealId, ...data }); // Global event for Kanban board
  }

  emitDealStageUpdated(dealId: string, data: any) {
    this.server.to(`deal:${dealId}`).emit('deal.stage.updated', { dealId, ...data });
    this.server.emit('deal.stage.updated', { dealId, ...data }); // Global event for Kanban board
  }

  emitDealFieldUpdated(dealId: string, fieldId: string, data: any) {
    this.server.to(`deal:${dealId}`).emit('deal.field.updated', {
      dealId,
      fieldId,
      ...data,
    });
  }

  emitDealTaskCreated(dealId: string, task: any) {
    this.server.to(`deal:${dealId}`).emit('deal.task.created', { dealId, task });
  }

  // Contact events
  emitContactUpdated(contactId: string, data: any) {
    this.server.to(`contact:${contactId}`).emit('contact.updated', { contactId, ...data });
  }

  emitContactCreated(contactId: string, data: any) {
    this.server.emit('contact.created', { contactId, ...data });
  }

  emitContactDeleted(contactId: string) {
    this.server.emit('contact.deleted', { contactId });
  }

  emitContactDealUpdated(contactId: string, dealId: string, data: any) {
    this.server.to(`contact:${contactId}`).emit('contact.deal.updated', {
      contactId,
      dealId,
      ...data,
    });
  }

  emitContactTaskUpdated(contactId: string, taskId: string, data: any) {
    this.server.to(`contact:${contactId}`).emit('contact.task.updated', {
      contactId,
      taskId,
      ...data,
    });
  }

  // Company events
  emitCompanyCreated(companyId: string, data: any) {
    this.server.emit('company.created', { companyId, ...data });
  }

  emitCompanyUpdated(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('company.updated', { companyId, ...data });
    this.server.emit('company.updated', { companyId, ...data }); // Global event
  }

  emitCompanyDeleted(companyId: string) {
    this.server.emit('company.deleted', { companyId });
  }

  emitCompanyDealUpdated(companyId: string, dealId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('company.deal.updated', {
      companyId,
      dealId,
      ...data,
    });
    this.server.emit('company.deal.updated', { companyId, dealId, ...data }); // Global event
  }

  emitCompanyContactUpdated(companyId: string, contactId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('company.contact.updated', {
      companyId,
      contactId,
      ...data,
    });
    this.server.emit('company.contact.updated', { companyId, contactId, ...data }); // Global event
  }

  // Task events
  emitTaskCreated(taskId: string, data: any) {
    this.server.emit('task.created', { taskId, ...data });
    if (data.dealId) {
      this.server.to(`deal:${data.dealId}`).emit('deal.task.created', { dealId: data.dealId, task: data });
    }
    if (data.contactId) {
      this.server.to(`contact:${data.contactId}`).emit('contact.task.created', { contactId: data.contactId, task: data });
    }
  }

  emitTaskUpdated(taskId: string, data: any) {
    this.server.to(`task:${taskId}`).emit('task.updated', { taskId, ...data });
    if (data.dealId) {
      this.server.to(`deal:${data.dealId}`).emit('deal.task.updated', { dealId: data.dealId, taskId, ...data });
    }
    if (data.contactId) {
      this.server.to(`contact:${data.contactId}`).emit('contact.task.updated', { contactId: data.contactId, taskId, ...data });
    }
  }

  emitTaskDeleted(taskId: string, data: any) {
    this.server.emit('task.deleted', { taskId, ...data });
  }

  // Comment events
  emitCommentCreated(comment: any) {
    if (comment.dealId) {
      this.server.to(`deal:${comment.dealId}`).emit('comment.created', comment);
    }
    if (comment.taskId) {
      this.server.to(`task:${comment.taskId}`).emit('comment.created', comment);
    }
    if (comment.contactId) {
      this.server.to(`contact:${comment.contactId}`).emit('comment.created', comment);
    }
  }

  // File events
  emitFileUploaded(file: any) {
    if (file.dealId) {
      this.server.to(`deal:${file.dealId}`).emit('file.uploaded', file);
    }
    if (file.taskId) {
      this.server.to(`task:${file.taskId}`).emit('file.uploaded', file);
    }
    if (file.contactId) {
      this.server.to(`contact:${file.contactId}`).emit('file.uploaded', file);
    }
  }

  emitFileDeleted(fileId: string, data: any) {
    if (data.dealId) {
      this.server.to(`deal:${data.dealId}`).emit('file.deleted', { fileId, ...data });
    }
    if (data.taskId) {
      this.server.to(`task:${data.taskId}`).emit('file.deleted', { fileId, ...data });
    }
    if (data.contactId) {
      this.server.to(`contact:${data.contactId}`).emit('file.deleted', { fileId, ...data });
    }
  }

  // Subscribe to deal updates
  @SubscribeMessage('subscribe:deal')
  handleSubscribeDeal(
    @MessageBody() data: { dealId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`deal:${data.dealId}`);
    return { event: 'subscribed', dealId: data.dealId };
  }

  @SubscribeMessage('unsubscribe:deal')
  handleUnsubscribeDeal(
    @MessageBody() data: { dealId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`deal:${data.dealId}`);
    return { event: 'unsubscribed', dealId: data.dealId };
  }

  // Subscribe to contact updates
  @SubscribeMessage('subscribe:contact')
  handleSubscribeContact(
    @MessageBody() data: { contactId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`contact:${data.contactId}`);
    return { event: 'subscribed', contactId: data.contactId };
  }

  @SubscribeMessage('unsubscribe:contact')
  handleUnsubscribeContact(
    @MessageBody() data: { contactId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`contact:${data.contactId}`);
    return { event: 'unsubscribed', contactId: data.contactId };
  }

  // Subscribe to task updates
  @SubscribeMessage('subscribe:task')
  handleSubscribeTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`task:${data.taskId}`);
    return { event: 'subscribed', taskId: data.taskId };
  }

  @SubscribeMessage('unsubscribe:task')
  handleUnsubscribeTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`task:${data.taskId}`);
    return { event: 'unsubscribed', taskId: data.taskId };
  }

  // Subscribe to company updates
  @SubscribeMessage('subscribe:company')
  handleSubscribeCompany(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`company:${data.companyId}`);
    return { event: 'subscribed', companyId: data.companyId };
  }

  @SubscribeMessage('unsubscribe:company')
  handleUnsubscribeCompany(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`company:${data.companyId}`);
    return { event: 'unsubscribed', companyId: data.companyId };
  }
}

