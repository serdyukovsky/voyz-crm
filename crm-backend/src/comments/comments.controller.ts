import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  create(@Body() createCommentDto: CreateCommentDto, @CurrentUser() user: any) {
    return this.commentsService.create(createCommentDto, user.userId || user.id);
  }

  @Get('deal/:dealId')
  @ApiOperation({ summary: 'Get comments for a deal' })
  findByDeal(@Param('dealId') dealId: string) {
    return this.commentsService.findByDeal(dealId);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get comments for a task' })
  findByTask(@Param('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Get('contact/:contactId')
  @ApiOperation({ summary: 'Get comments for a contact' })
  findByContact(@Param('contactId') contactId: string) {
    return this.commentsService.findByContact(contactId);
  }

  @Patch(':id/type')
  @ApiOperation({ summary: 'Update comment type (pin/unpin)' })
  @ApiResponse({ status: 200, description: 'Comment type updated' })
  updateType(
    @Param('id') id: string,
    @Body('type') type: 'COMMENT' | 'INTERNAL_NOTE' | 'CLIENT_MESSAGE',
    @CurrentUser() user: any,
  ) {
    return this.commentsService.updateType(id, type, user.userId || user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}






