import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/auth/decorators/public.decorator';
import { GithubWebhookService } from './github-webhook.service';
import * as crypto from 'crypto';

@Controller('integrations/github')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);

  constructor(
    private readonly githubWebhookService: GithubWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    try {
      this.logger.log('Received GitHub webhook');
      console.log('[WEBHOOK] Received GitHub webhook');

      const secret = this.configService.get('GITHUB_WEBHOOK_SECRET');
      if (!secret) {
        this.logger.warn('GITHUB_WEBHOOK_SECRET not configured');
        throw new BadRequestException('Webhook secret not configured');
      }

      if (!signature) {
        console.log('[WEBHOOK] No signature provided!');
        throw new BadRequestException('No signature header');
      }

      // Validate HMAC signature
      const body = JSON.stringify(payload);
      const hash =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(body).digest('hex');

      try {
        crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
        console.log('[WEBHOOK] Signature VALID!');
      } catch (e) {
        console.log('[WEBHOOK] Signature INVALID');
        console.log('[WEBHOOK] Expected:', hash);
        console.log('[WEBHOOK] Received:', signature);
        throw new BadRequestException('Invalid signature');
      }

      this.logger.log(`Valid webhook from ${payload.repository?.full_name}`);

      // Process push event
      if (payload.ref) {
        const branch = payload.ref.replace('refs/heads/', '');
        const repository = payload.repository?.full_name;
        const pusher = payload.pusher?.name || 'unknown';
        const commits = payload.commits?.length || 0;

        console.log('[WEBHOOK] Calling handlePush...');
        await this.githubWebhookService.handlePush({
          branch,
          repository,
          pusher,
          commits,
          timestamp: new Date(),
        });
        console.log('[WEBHOOK] handlePush completed');
      }

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      console.error(
        '[WEBHOOK] Error:',
        error instanceof Error ? error.message : String(error),
      );
      this.logger.error(
        'Error:',
        error instanceof Error ? error.message : String(error),
      );
      throw new InternalServerErrorException('Failed to process webhook');
    }
  }

  @Post('webhook/ping')
  @Public()
  @HttpCode(200)
  ping() {
    this.logger.log('Webhook ping received');
    return { status: 'ok' };
  }
}
