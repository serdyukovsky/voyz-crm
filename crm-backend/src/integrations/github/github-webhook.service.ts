import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface PushEvent {
  branch: string
  repository: string
  pusher: string
  commits: number
  timestamp: Date
}

interface DeploymentResult {
  environment: 'dev' | 'prod'
  status: 'success' | 'failed'
  message: string
  duration: number
  startTime: Date
  endTime: Date
}

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name)
  private readonly devPath: string
  private readonly prodPath: string

  constructor(private readonly configService: ConfigService) {
    this.devPath = this.configService.get('CRM_BACKEND_DEV_PATH') || '/root/crm-backend-dev'
    this.prodPath = this.configService.get('CRM_BACKEND_PROD_PATH') || '/root/crm-backend-prod'
  }

  async handlePush(event: PushEvent): Promise<void> {
    this.logger.log('Processing push event for branch: ' + event.branch)
    const deploymentTasks: Promise<DeploymentResult>[] = []

    if (event.branch === 'develop') {
      this.logger.log('Deploying to DEV environment')
      deploymentTasks.push(this.deployEnvironment('dev', this.devPath, event.branch, event))
    }

    if (event.branch === 'main' || event.branch === 'production') {
      this.logger.log('Deploying to PROD environment')
      deploymentTasks.push(this.deployEnvironment('prod', this.prodPath, event.branch, event))
    }

    if (deploymentTasks.length > 0) {
      const results = await Promise.all(deploymentTasks)
      results.forEach(result => this.logDeploymentResult(result))
    } else {
      this.logger.log('Branch ' + event.branch + ' does not trigger deployment')
    }
  }

  private async deployEnvironment(
    environment: 'dev' | 'prod',
    projectPath: string,
    branch: string,
    event: PushEvent,
  ): Promise<DeploymentResult> {
    const startTime = new Date()
    const envUpper = environment.toUpperCase()

    try {
      this.logger.log('[' + envUpper + '] Starting deployment...')
      await this.executeCommand(
        'cd ' + projectPath + ' && git fetch origin && git checkout ' + branch + ' && git pull origin ' + branch,
        environment,
      )
      await this.executeCommand('cd ' + projectPath + ' && npm install', environment)
      await this.executeCommand('cd ' + projectPath + ' && npm run build', environment)
      await this.executeCommand('cd ' + projectPath + ' && npx prisma migrate deploy', environment)

      const port = environment === 'dev' ? 3001 : 3002
      await this.restartApplication(environment, port, projectPath)

      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000
      const message = 'Successfully deployed to ' + environment + ' (' + event.commits + ' commits from ' + event.pusher + ')'
      this.logger.log('[' + envUpper + '] OK ' + message)

      return { environment, status: 'success', message, duration, startTime, endTime }
    } catch (error) {
      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error('[' + envUpper + '] Deployment failed: ' + errorMessage)

      return {
        environment,
        status: 'failed',
        message: 'Deployment failed: ' + errorMessage,
        duration,
        startTime,
        endTime,
      }
    }
  }

  private async executeCommand(command: string, environment: string): Promise<string> {
    try {
      const result = await execAsync(command, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
      return result.stdout
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error('Command failed: ' + errorMessage)
    }
  }

  private async restartApplication(environment: string, port: number, projectPath: string): Promise<void> {
    try {
      await this.executeCommand('lsof -ti:' + port + ' | xargs kill -9 2>/dev/null || true', environment)
      await new Promise(resolve => setTimeout(resolve, 2000))

      try {
        await this.executeCommand('which pm2', environment)
        await this.executeCommand(
          'cd ' + projectPath + ' && pm2 restart crm-backend-' + environment + ' || pm2 start dist/main.js --name crm-backend-' + environment + ' -- --port ' + port,
          environment,
        )
      } catch {
        const nodeEnv = environment === 'prod' ? 'production' : 'development'
        await this.executeCommand(
          'cd ' + projectPath + ' && NODE_ENV=' + nodeEnv + ' PORT=' + port + ' node dist/main.js &',
          environment,
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const envUpper = environment.toUpperCase()
      this.logger.error('[' + envUpper + '] Failed to restart: ' + errorMessage)
      throw error
    }
  }

  private logDeploymentResult(result: DeploymentResult): void {
    const emoji = result.status === 'success' ? 'OK' : 'FAIL'
    const envUpper = result.environment.toUpperCase()
    this.logger.log(
      '[' + envUpper + '] ' + emoji + ' ' + result.message + ' (' + result.duration.toFixed(2) + 's)',
    )
  }
}
