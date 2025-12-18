import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('threads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get or create a chat thread' })
  @ApiResponse({ status: 201, description: 'Thread created or found' })
  async getOrCreateThread(
    @Body() dto: CreateThreadDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getOrCreateThread(user.userId || user.id, dto);
  }

  @Get('threads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all threads for current user' })
  @ApiResponse({ status: 200, description: 'List of threads' })
  async getUserThreads(@CurrentUser() user: any) {
    return this.chatService.getUserThreads(user.userId || user.id);
  }

  @Get('threads/:threadId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific thread with messages' })
  @ApiResponse({ status: 200, description: 'Thread details' })
  async getThread(
    @Param('threadId') threadId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getThread(threadId, user.userId || user.id);
  }

  @Post('threads/:threadId/messages')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.sendMessage(threadId, user.userId || user.id, dto);
  }
}
