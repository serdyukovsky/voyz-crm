import { Controller, Post, Body, Headers, HttpCode, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GithubWebhookService } from './github-webhook.service'
import * as crypto from 'crypto'

@Controller('integrations/github')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name)

  constructor(
    private readonly githubWebhookService: GithubWebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle GitHub push webhook events
   * Verifies HMAC signature and triggers deployment based on branch
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log('Received GitHub webhook')

    // Verify signature
    const secret = this.configService.get('GITHUB_WEBHOOK_SECRET')
    if (!secret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET not configured')
      throw new BadRequestException('Webhook secret not configured')
    }

    const body = JSON.stringify(payload)
    const hash = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

    if (!crypto.timingSafeEqual(hash, signature)) {
      this.logger.warn('Invalid webhook signature')
      throw new BadRequestException('Invalid signature')
    }

    this.logger.log(`Valid webhook from ${payload.repository?.full_name}`)

    // Handle push event
    if (payload.ref) {
      const branch = payload.ref.replace('refs/heads/', '')
      const repository = payload.repository?.full_name
      const pusher = payload.pusher?.name || 'unknown'
      const commits = payload.commits?.length || 0

      this.logger.log(`Push to ${repository}/${branch} by ${pusher} (${commits} commits)`)

      // Trigger deployment
      await this.githubWebhookService.handlePush({
        branch,
        repository,
        pusher,
        commits,
        timestamp: new Date(),
      })
    }

    return { success: true, message: 'Webhook processed' }
  }

  /**
   * Health check endpoint
   */
  @Post('webhook/ping')
  @HttpCode(200)
  ping() {
    this.logger.log('Webhook ping received')
    return { status: 'ok' }
  }
}
