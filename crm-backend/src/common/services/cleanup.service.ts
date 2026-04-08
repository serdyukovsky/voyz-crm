import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Every day at 3:00 AM — delete expired refresh tokens */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRefreshTokens() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
    }
  }

  /** Every day at 4:00 AM — delete logs older than 90 days */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldLogs() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const result = await this.prisma.log.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} logs older than 90 days`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', error);
    }
  }
}
