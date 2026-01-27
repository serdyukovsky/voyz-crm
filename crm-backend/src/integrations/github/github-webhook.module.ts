import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GithubWebhookController } from './github-webhook.controller'
import { GithubWebhookService } from './github-webhook.service'

@Module({
  imports: [ConfigModule],
  controllers: [GithubWebhookController],
  providers: [GithubWebhookService],
  exports: [GithubWebhookService],
})
export class GithubWebhookModule {}
