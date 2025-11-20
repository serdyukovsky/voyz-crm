import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto: any) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  findAll() {
    return this.messagesService.findAll();
  }

  @Get('deal/:dealId')
  findByDeal(@Param('dealId') dealId: string) {
    return this.messagesService.findByDeal(dealId);
  }

  @Post(':id/link')
  linkToDeal(@Param('id') id: string, @Body('dealId') dealId: string) {
    return this.messagesService.linkToDeal(id, dealId);
  }
}

