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

  /**
   * Handle GitHub push event
   * Deploy to appropriate environment based on branch
   */
  async handlePush(event: PushEvent): Promise<void> {
    this.logger.log(`Processing push event for branch: ${event.branch}`)

    const deploymentTasks: Promise<DeploymentResult>[] = []

    // Deploy to dev on develop branch
    if (event.branch === 'develop') {
      this.logger.log('Deploying to DEV environment')
      deploymentTasks.push(
        this.deployEnvironment('dev', this.devPath, event.branch, event),
      )
    }

    // Deploy to prod on main/production branch
    if (event.branch === 'main' || event.branch === 'production') {
      this.logger.log('Deploying to PROD environment')
      deploymentTasks.push(
        this.deployEnvironment('prod', this.prodPath, event.branch, event),
      )
    }

    // Execute deployments
    if (deploymentTasks.length > 0) {
      const results = await Promise.all(deploymentTasks)
      results.forEach(result => this.logDeploymentResult(result))
    } else {
      this.logger.log(`Branch ${event.branch} does not trigger deployment`)
    }
  }

  /**
   * Deploy to specific environment
   */
  private async deployEnvironment(
    environment: 'dev' | 'prod',
    projectPath: string,
    branch: string,
    event: PushEvent,
  ): Promise<DeploymentResult> {
    const startTime = new Date()

    try {
      this.logger.log(`[${environment.toUpperCase()}] Starting deployment...`)

      // Step 1: Git pull with rebase to handle divergent branches
      this.logger.log(`[${environment.toUpperCase()}] Pulling latest code from ${branch}...`)
      await this.executeCommand(
        `cd ${projectPath} && git fetch origin && git checkout ${branch} && git pull --rebase origin ${branch}`,
        environment,
      )

      // Step 2: Install dependencies
      this.logger.log(`[${environment.toUpperCase()}] Installing dependencies...`)
      await this.executeCommand(`cd ${projectPath} && npm install`, environment)

      // Step 3: Build
      this.logger.log(`[${environment.toUpperCase()}] Building application...`)
      await this.executeCommand(`cd ${projectPath} && npm run build`, environment)

      // Step 4: Run migrations
      this.logger.log(`[${environment.toUpperCase()}] Running database migrations...`)
      await this.executeCommand(
        `cd ${projectPath} && npx prisma migrate deploy`,
        environment,
      )

      // Step 5: Restart application
      this.logger.log(`[${environment.toUpperCase()}] Restarting application...`)
      const port = environment === 'dev' ? 3001 : 3002
      await this.restartApplication(environment, port, projectPath)

      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000

      const message = `Successfully deployed to ${environment} (${event.commits} commits from ${event.pusher})`
      this.logger.log(`[${environment.toUpperCase()}] ✓ ${message}`)

      return {
        environment,
        status: 'success',
        message,
        duration,
        startTime,
        endTime,
      }
    } catch (error) {
      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000

      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `[${environment.toUpperCase()}] Deployment failed: ${errorMessage}`,
      )

      return {
        environment,
        status: 'failed',
        message: `Deployment failed: ${errorMessage}`,
        duration,
        startTime,
        endTime,
      }
    }
  }

  /**
   * Execute shell command
   */
  private async executeCommand(command: string, environment: string): Promise<string> {
    this.logger.debug(`[${environment.toUpperCase()}] Executing: ${command}`)

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      if (stderr && !stderr.includes('npm WARN')) {
        this.logger.warn(`[${environment.toUpperCase()}] Warning: ${stderr}`)
      }

      return stdout
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Command failed: ${errorMessage}`)
    }
  }

  /**
   * Restart application using PM2 or systemctl
   */
  private async restartApplication(
    environment: string,
    port: number,
    projectPath: string,
  ): Promise<void> {
    try {
      // Try to kill process on the port
      await this.executeCommand(
        `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`,
        environment,
      )

      // Wait a bit for port to be released
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if PM2 is available
      try {
        await this.executeCommand('which pm2', environment)
        this.logger.log(
          `[${environment.toUpperCase()}] Restarting with PM2 on port ${port}`,
        )
        await this.executeCommand(
          `cd ${projectPath} && pm2 restart crm-backend-${environment} || pm2 start dist/main.js --name crm-backend-${environment} -- --port ${port}`,
          environment,
        )
      } catch {
        // If PM2 not available, start directly
        this.logger.log(
          `[${environment.toUpperCase()}] Starting application directly on port ${port}`,
        )
        await this.executeCommand(
          `cd ${projectPath} && NODE_ENV=${environment === 'prod' ? 'production' : 'development'} PORT=${port} node dist/main.js &`,
          environment,
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`[${environment.toUpperCase()}] Failed to restart: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Log deployment result
   */
  private logDeploymentResult(result: DeploymentResult): void {
    const emoji = result.status === 'success' ? '✓' : '✗'
    this.logger.log(
      `[${result.environment.toUpperCase()}] ${emoji} ${result.message} (${result.duration.toFixed(2)}s)`,
    )
  }
}
