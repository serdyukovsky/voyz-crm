import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/services/prisma.service';
import { ActivityService } from '@/activity/activity.service';
import { ActivityType } from '@prisma/client';
import { SendEmailDto } from './dto/send-email.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly configService: ConfigService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.warn('SMTP configuration is missing. Email sending will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  async sendEmail(sendEmailDto: SendEmailDto, userId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      throw new BadRequestException('Email service is not configured. Please configure SMTP settings.');
    }

    try {
      // Get user email for 'from' field
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const fromEmail = user.email;
      const fromName = `${user.firstName} ${user.lastName}`;

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: sendEmailDto.to,
        subject: sendEmailDto.subject,
        text: sendEmailDto.text,
        html: sendEmailDto.html || sendEmailDto.text.replace(/\n/g, '<br>'),
      });

      // Log activity
      await this.activityService.create({
        type: ActivityType.EMAIL_SENT,
        userId,
        dealId: sendEmailDto.dealId,
        contactId: sendEmailDto.contactId,
        payload: {
          to: sendEmailDto.to,
          subject: sendEmailDto.subject,
          messageId: info.messageId,
          companyId: sendEmailDto.companyId,
        },
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }
}





