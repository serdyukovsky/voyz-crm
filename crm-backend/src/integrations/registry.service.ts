import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { IntegrationType } from '@prisma/client';
import { IntegrationServiceInterface, IntegrationConfig } from './common/integration.interface';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { TelegramService } from './telegram/telegram.service';
import { VkService } from './vk/vk.service';
import { EmailService } from './email/email.service';
import { TelephonyService } from './telephony/telephony.service';

@Injectable()
export class IntegrationRegistryService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationRegistryService.name);
  private integrations: Map<IntegrationType, IntegrationServiceInterface> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly telegramService: TelegramService,
    private readonly vkService: VkService,
    private readonly emailService: EmailService,
    private readonly telephonyService: TelephonyService,
  ) {}

  async onModuleInit() {
    await this.loadIntegrations();
  }

  /**
   * Load all integrations from database and initialize them
   */
  async loadIntegrations(): Promise<void> {
    const settings = await this.prisma.integrationSettings.findMany({
      where: { enabled: true },
    });

    for (const setting of settings) {
      try {
        const integration = this.getIntegrationService(setting.type);
        if (integration) {
          await integration.initialize({
            type: setting.type,
            enabled: setting.enabled,
            credentials: setting.credentials as Record<string, any>,
            webhookUrl: setting.webhookUrl || undefined,
            config: setting.config as Record<string, any> || undefined,
          });
          this.integrations.set(setting.type, integration);
          this.logger.log(`Loaded integration: ${setting.type}`);
        }
      } catch (error) {
        this.logger.error(`Failed to load integration ${setting.type}`, error);
      }
    }
  }

  /**
   * Get integration service by type
   */
  getIntegrationService(type: IntegrationType): IntegrationServiceInterface | null {
    switch (type) {
      case IntegrationType.WHATSAPP:
        return this.whatsappService;
      case IntegrationType.TELEGRAM:
        return this.telegramService;
      case IntegrationType.VK:
        return this.vkService;
      case IntegrationType.EMAIL:
        return this.emailService;
      case IntegrationType.TELEPHONY:
        return this.telephonyService;
      default:
        this.logger.warn(`Unknown integration type: ${type}`);
        return null;
    }
  }

  /**
   * Get all active integrations
   */
  getActiveIntegrations(): IntegrationServiceInterface[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Check if integration is available
   */
  isIntegrationAvailable(type: IntegrationType): boolean {
    return this.integrations.has(type);
  }

  /**
   * Reload integration configuration
   */
  async reloadIntegration(type: IntegrationType): Promise<boolean> {
    try {
      const setting = await this.prisma.integrationSettings.findUnique({
        where: { type },
      });

      if (!setting || !setting.enabled) {
        this.integrations.delete(type);
        return false;
      }

      const integration = this.getIntegrationService(type);
      if (integration) {
        await integration.initialize({
          type: setting.type,
          enabled: setting.enabled,
          credentials: setting.credentials as Record<string, any>,
          webhookUrl: setting.webhookUrl || undefined,
          config: setting.config as Record<string, any> || undefined,
        });
        this.integrations.set(type, integration);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to reload integration ${type}`, error);
      return false;
    }
  }
}

