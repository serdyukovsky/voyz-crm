import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const ALLOWED_BRANCHES = new Set(['develop', 'main', 'production'])

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

    if (!ALLOWED_BRANCHES.has(branch)) {
      throw new Error(`Branch "${branch}" is not allowed for deployment`)
    }

    try {
      this.logger.log(`[${environment.toUpperCase()}] Starting deployment...`)

      // Step 1: Git pull with rebase to handle divergent branches
      this.logger.log(`[${environment.toUpperCase()}] Pulling latest code from ${branch}...`)
      await this.runCommand('git', ['fetch', 'origin'], projectPath, environment)
      await this.runCommand('git', ['checkout', branch], projectPath, environment)
      await this.runCommand('git', ['pull', '--rebase', 'origin', branch], projectPath, environment)

      // Step 2: Install dependencies
      this.logger.log(`[${environment.toUpperCase()}] Installing dependencies...`)
      await this.runCommand('npm', ['install'], projectPath, environment)

      // Step 3: Build
      this.logger.log(`[${environment.toUpperCase()}] Building application...`)
      await this.runCommand('npm', ['run', 'build'], projectPath, environment)

      // Step 4: Backup database before migrations
      if (environment === 'prod') {
        this.logger.log(`[${environment.toUpperCase()}] Creating database backup before migrations...`)
        await this.runCommand('/usr/local/bin/backup-crm-db.sh', [], undefined, environment)
      }

      // Step 5: Run migrations
      this.logger.log(`[${environment.toUpperCase()}] Running database migrations...`)
      await this.runCommand('npx', ['prisma', 'migrate', 'deploy'], projectPath, environment)

      // Step 6: Restart application
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
   * Execute a command safely using execFile (no shell interpolation)
   */
  private async runCommand(
    file: string,
    args: string[],
    cwd: string | undefined,
    environment: string,
  ): Promise<string> {
    this.logger.debug(`[${environment.toUpperCase()}] Executing: ${file} ${args.join(' ')}`)

    try {
      const { stdout, stderr } = await execFileAsync(file, args, {
        cwd,
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
   * Restart application using PM2 or node directly
   */
  private async restartApplication(
    environment: 'dev' | 'prod',
    port: number,
    projectPath: string,
  ): Promise<void> {
    const appName = `crm-backend-${environment}`
    const nodeEnv = environment === 'prod' ? 'production' : 'development'

    try {
      // Try to kill process on the port using lsof + kill (port is a number, safe)
      try {
        const { stdout: pids } = await execFileAsync('lsof', ['-ti', `:${port}`])
        const pidList = pids.trim().split('\n').filter(Boolean)
        for (const pid of pidList) {
          await execFileAsync('kill', ['-9', pid])
        }
      } catch {
        // No process on port — that's fine
      }

      // Wait a bit for port to be released
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if PM2 is available
      try {
        await execFileAsync('which', ['pm2'])
        this.logger.log(
          `[${environment.toUpperCase()}] Restarting with PM2 on port ${port}`,
        )
        try {
          await this.runCommand('pm2', ['restart', appName], projectPath, environment)
        } catch {
          await this.runCommand(
            'pm2',
            ['start', 'dist/main.js', '--name', appName, '--', '--port', String(port)],
            projectPath,
            environment,
          )
        }
      } catch {
        // If PM2 not available, start directly
        this.logger.log(
          `[${environment.toUpperCase()}] Starting application directly on port ${port}`,
        )
        const { spawn } = await import('child_process')
        const child = spawn('node', ['dist/main.js'], {
          cwd: projectPath,
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, NODE_ENV: nodeEnv, PORT: String(port) },
        })
        child.unref()
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
