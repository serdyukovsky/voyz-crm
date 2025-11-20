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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WsGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join:deal')
  handleJoinDeal(@MessageBody() dealId: string, @ConnectedSocket() client: Socket) {
    client.join(`deal:${dealId}`);
    this.logger.log(`Client ${client.id} joined deal ${dealId}`);
  }

  @SubscribeMessage('leave:deal')
  handleLeaveDeal(@MessageBody() dealId: string, @ConnectedSocket() client: Socket) {
    client.leave(`deal:${dealId}`);
    this.logger.log(`Client ${client.id} left deal ${dealId}`);
  }

  // Broadcast events
  broadcastMessageNew(message: any) {
    this.server.emit('message:new', message);
    if (message.dealId) {
      this.server.to(`deal:${message.dealId}`).emit('message:new', message);
    }
  }

  broadcastCallNew(call: any) {
    this.server.emit('call:new', call);
    if (call.dealId) {
      this.server.to(`deal:${call.dealId}`).emit('call:new', call);
    }
  }

  broadcastDealUpdate(deal: any) {
    this.server.to(`deal:${deal.id}`).emit('deal:update', deal);
  }

  broadcastActivityNew(activity: any) {
    if (activity.dealId) {
      this.server.to(`deal:${activity.dealId}`).emit('activity:new', activity);
    }
  }

  broadcastTaskUpdate(task: any) {
    if (task.dealId) {
      this.server.to(`deal:${task.dealId}`).emit('task:update', task);
    }
  }
}

