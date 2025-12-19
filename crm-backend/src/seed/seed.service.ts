import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class SeedService {
  constructor(private prisma: PrismaService) {}

  async createTestData() {
    const PIPELINE_DATA = {
      name: '🚀 Продажи — Тестовая воронка',
      description: 'Тестовая воронка для демонстрации функционала импорта и работы с CRM',
      isDefault: true,
      isActive: true,
      order: 0,
    };

    const STAGES_DATA = [
      { name: 'Новый лид', color: '#94a3b8', order: 0, isDefault: true, isClosed: false },
      { name: 'Квалификация', color: '#3b82f6', order: 1, isDefault: false, isClosed: false },
      { name: 'Переговоры', color: '#f59e0b', order: 2, isDefault: false, isClosed: false },
      { name: 'Отправлено КП', color: '#8b5cf6', order: 3, isDefault: false, isClosed: false },
      { name: 'Закрыто-Выиграно', color: '#10b981', order: 4, isDefault: false, isClosed: true },
      { name: 'Закрыто-Проиграно', color: '#ef4444', order: 5, isDefault: false, isClosed: true },
    ];

    const TEST_DEALS = [
      {
        title: 'Внедрение CRM системы для ООО "Альфа"',
        number: 'DEAL-001',
        amount: 450000,
        stageName: 'Переговоры',
        description: 'Крупный клиент, заинтересован во внедрении полного цикла CRM',
      },
      {
        title: 'Консультация по автоматизации — ИП Петров',
        number: 'DEAL-002',
        amount: 75000,
        stageName: 'Квалификация',
        description: 'Небольшой проект, обсуждаем объем работ',
      },
      {
        title: 'Разработка интеграции с 1С — ООО "Бета"',
        number: 'DEAL-003',
        amount: 320000,
        stageName: 'Отправлено КП',
        description: 'Коммерческое предложение отправлено 2 дня назад',
      },
      {
        title: 'Техподдержка CRM — ООО "Гамма"',
        number: 'DEAL-004',
        amount: 150000,
        stageName: 'Закрыто-Выиграно',
        description: 'Контракт подписан, начинаем работу',
      },
      {
        title: 'Обучение персонала — ИП Сидоров',
        number: 'DEAL-005',
        amount: 50000,
        stageName: 'Новый лид',
        description: 'Входящая заявка, требуется первичная квалификация',
      },
      {
        title: 'Доработка модулей CRM — ООО "Дельта"',
        number: 'DEAL-006',
        amount: 280000,
        stageName: 'Квалификация',
        description: 'Уточняем требования к доработкам',
      },
      {
        title: 'Консалтинг по процессам — ЗАО "Эпсилон"',
        number: 'DEAL-007',
        amount: 95000,
        stageName: 'Закрыто-Проиграно',
        description: 'Клиент выбрал другого подрядчика',
      },
    ];

    try {
      // Получаем первого пользователя
      const firstUser = await this.prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!firstUser) {
        return {
          success: false,
          error: 'Не найдено ни одного пользователя в системе',
        };
      }

      // Создаём pipeline
      const pipeline = await this.prisma.pipeline.create({
        data: PIPELINE_DATA,
      });

      // Создаём stages
      const stagesMap = new Map<string, string>();
      for (const stageData of STAGES_DATA) {
        const stage = await this.prisma.stage.create({
          data: {
            ...stageData,
            pipelineId: pipeline.id,
          },
        });
        stagesMap.set(stage.name, stage.id);
      }

      // Создаём сделки
      const createdDeals = [];
      for (const dealData of TEST_DEALS) {
        const stageId = stagesMap.get(dealData.stageName);
        if (!stageId) continue;

        const deal = await this.prisma.deal.create({
          data: {
            title: dealData.title,
            number: dealData.number,
            amount: dealData.amount,
            description: dealData.description,
            stageId: stageId,
            pipelineId: pipeline.id,
            assignedToId: firstUser.id,
            createdById: firstUser.id,
          },
        });
        createdDeals.push(deal);
      }

      return {
        success: true,
        message: 'Тестовые данные успешно созданы!',
        data: {
          pipeline: {
            id: pipeline.id,
            name: pipeline.name,
          },
          stagesCount: STAGES_DATA.length,
          dealsCount: createdDeals.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

