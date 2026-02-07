import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats() {
    // Deals by stage (оптимизация: используем groupBy результат для totalDeals)
    const dealsByStageData = await this.prisma.deal.groupBy({
      by: ['stageId'],
      _count: {
        id: true,
      },
    });

    // Total deals - вычисляем из groupBy чтобы избежать лишнего count() запроса
    const totalDeals = dealsByStageData.reduce((sum, stage) => sum + stage._count.id, 0);

    const stageIds = dealsByStageData.map((d) => d.stageId);
    const stages = await this.prisma.stage.findMany({
      where: {
        id: { in: stageIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const dealsByStage = dealsByStageData.map((dealData) => {
      const stage = stages.find((s) => s.id === dealData.stageId);
      return {
        stageName: stage?.name || 'Unknown',
        count: dealData._count.id,
      };
    });

    // Total revenue (sum of closed deals) - оптимизация: используем aggregate вместо findMany
    const totalRevenueResult = await this.prisma.deal.aggregate({
      where: {
        stage: {
          type: { in: ['WON', 'LOST'] },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

    // Tasks today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksToday = await this.prisma.task.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // New contacts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newContacts = await this.prisma.contact.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Top companies by deal count and revenue
    const companyDeals = await this.prisma.deal.groupBy({
      by: ['companyId'],
      where: {
        companyId: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const companyIds = companyDeals
      .map((d) => d.companyId)
      .filter((id): id is string => id !== null);

    const companies = await this.prisma.company.findMany({
      where: {
        id: { in: companyIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const topCompanies = companyDeals
      .map((dealData) => {
        const company = companies.find((c) => c.id === dealData.companyId);
        if (!company) return null;
        return {
          companyId: company.id,
          companyName: company.name,
          dealCount: dealData._count.id,
          totalRevenue: Number(dealData._sum.amount || 0),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Top managers by deal count and revenue
    const managerDeals = await this.prisma.deal.groupBy({
      by: ['assignedToId'],
      where: {
        assignedToId: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const managerIds = managerDeals
      .map((d) => d.assignedToId)
      .filter((id): id is string => id !== null);

    const managers = await this.prisma.user.findMany({
      where: {
        id: { in: managerIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const topManagers = managerDeals
      .map((dealData) => {
        const manager = managers.find((m) => m.id === dealData.assignedToId);
        if (!manager) return null;
        return {
          userId: manager.id,
          userName: `${manager.firstName} ${manager.lastName}`,
          dealCount: dealData._count.id,
          totalRevenue: Number(dealData._sum.amount || 0),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Revenue trend (last 7 days) - оптимизация: используем raw SQL для GROUP BY на уровне БД
    const sevenDaysAgoForTrend = new Date();
    sevenDaysAgoForTrend.setDate(sevenDaysAgoForTrend.getDate() - 7);
    sevenDaysAgoForTrend.setHours(0, 0, 0, 0);

    // Используем raw SQL для эффективной группировки по дате на уровне БД
    // Примечание: используем Prisma.sql для безопасной интерполяции даты
    const revenueTrendRaw = await this.prisma.$queryRaw<Array<{ date: Date; revenue: number }>>`
      SELECT 
        DATE(COALESCE("closedAt", "updatedAt")) as date,
        SUM("amount")::numeric as revenue
      FROM "deals"
      WHERE "stageId" IN (SELECT id FROM "stages" WHERE "type" IN ('WON', 'LOST'))
        AND (COALESCE("closedAt", "updatedAt") >= ${sevenDaysAgoForTrend}::timestamp)
      GROUP BY DATE(COALESCE("closedAt", "updatedAt"))
      ORDER BY date
    `;

    // Group by date (use closedAt if available, otherwise updatedAt)
    const revenueByDate = new Map<string, number>();
    revenueTrendRaw.forEach((row) => {
      const dateKey = row.date.toISOString().split('T')[0];
      revenueByDate.set(dateKey, Number(row.revenue));
    });

    // Fill in missing days with 0
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      revenueTrend.push({
        date: dateKey,
        revenue: revenueByDate.get(dateKey) || 0,
      });
    }

    return {
      totalDeals,
      dealsByStage,
      totalRevenue,
      tasksToday,
      newContacts,
      topCompanies,
      topManagers,
      revenueTrend,
    };
  }
}

