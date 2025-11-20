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
    this.server.emit(`deal:${dealId}:updated`, data);
  }

  emitDealFieldUpdated(dealId: string, fieldId: string, data: any) {
    this.server.emit(`deal:${dealId}:field:updated`, {
      fieldId,
      ...data,
    });
  }

  // Task events
  emitTaskCreated(dealId: string, task: any) {
    this.server.emit(`deal:${dealId}:task:created`, task);
  }

  emitTaskUpdated(dealId: string, taskId: string, data: any) {
    this.server.emit(`deal:${dealId}:task:${taskId}:updated`, data);
  }

  // Comment events
  emitCommentCreated(dealId: string, comment: any) {
    this.server.emit(`deal:${dealId}:comment:created`, comment);
  }

  // File events
  emitFileUploaded(dealId: string, file: any) {
    this.server.emit(`deal:${dealId}:file:uploaded`, file);
  }

  emitFileDeleted(dealId: string, fileId: string) {
    this.server.emit(`deal:${dealId}:file:${fileId}:deleted`);
  }

  // Activity events
  emitActivityCreated(dealId: string, activity: any) {
    this.server.emit(`deal:${dealId}:activity:created`, activity);
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
}

