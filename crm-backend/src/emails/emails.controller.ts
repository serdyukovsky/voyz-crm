import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { SendEmailDto } from './dto/send-email.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Emails')
@Controller('emails')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        messageId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or email service not configured',
  })
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.emailsService.sendEmail(
      sendEmailDto,
      user.userId || user.id,
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  }
}





