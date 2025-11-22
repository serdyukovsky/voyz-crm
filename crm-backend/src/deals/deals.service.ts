import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { Deal, ActivityType } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly websocketGateway: RealtimeGateway,
  ) {}

  async create(data: any, userId: string) {
    const deal = await this.prisma.deal.create({
      data: {
        ...data,
        createdById: userId,
      },
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: {
          include: {
            company: true,
          },
        },
      },
    });

    // Create activity
    await this.activityService.create({
      type: ActivityType.DEAL_CREATED,
      userId,
      dealId: deal.id,
      contactId: deal.contactId || undefined,
      payload: {
        dealTitle: deal.title,
      },
    });

    // Emit WebSocket events
    this.websocketGateway.emitDealUpdated(deal.id, deal);
    if (deal.contactId) {
      this.websocketGateway.emitContactDealUpdated(deal.contactId, deal.id, deal);
    }

    return this.formatDealResponse(deal);
  }

  async findAll(filters?: {
    pipelineId?: string;
    stageId?: string;
    assignedToId?: string;
    contactId?: string;
    companyId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters?.stageId) where.stageId = filters.stageId;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.contactId) where.contactId = filters.contactId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: {
          include: {
            company: true,
          },
        },
        company: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format deals with contact stats
    return Promise.all(deals.map((deal) => this.formatDealResponse(deal)));
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: {
          include: {
            company: true,
          },
        },
        tasks: true,
        comments: true,
        activities: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        files: true,
        customFieldValues: {
          include: { customField: true },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return this.formatDealResponse(deal);
  }

  private async formatDealResponse(deal: any) {
    const result: any = { ...deal };

    // Add contact with stats if contact exists
    if (deal.contact) {
      const contactStats = await this.getContactStats(deal.contact.id);
      result.contact = {
        id: deal.contact.id,
        fullName: deal.contact.fullName,
        email: deal.contact.email,
        phone: deal.contact.phone,
        position: deal.contact.position,
        companyName: deal.contact.companyName,
        company: deal.contact.company,
        social: deal.contact.social as {
          instagram?: string;
          telegram?: string;
          whatsapp?: string;
          vk?: string;
        },
        stats: contactStats,
      };
    }

    // Add company with stats if company exists
    if (deal.company) {
      const companyStats = await this.getCompanyStats(deal.company.id);
      result.company = {
        id: deal.company.id,
        name: deal.company.name,
        industry: deal.company.industry,
        website: deal.company.website,
        email: deal.company.email,
        phone: deal.company.phone,
        social: deal.company.social,
        address: deal.company.address,
        notes: deal.company.notes,
        stats: companyStats,
      };
    }

    return result;
  }

  private async getCompanyStats(companyId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { companyId },
      select: {
        id: true,
        amount: true,
        closedAt: true,
      },
    });

    const activeDeals = deals.filter((d) => !d.closedAt);
    const closedDeals = deals.filter((d) => d.closedAt);
    const totalDealVolume = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.amount),
      0,
    );

    return {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      closedDeals: closedDeals.length,
      totalDealVolume,
    };
  }

  private async getContactStats(contactId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { contactId },
      select: {
        id: true,
        amount: true,
        closedAt: true,
      },
    });

    const activeDeals = deals.filter((d) => !d.closedAt);
    const closedDeals = deals.filter((d) => d.closedAt);
    const totalDealVolume = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.amount),
      0,
    );

    return {
      activeDeals: activeDeals.length,
      closedDeals: closedDeals.length,
      totalDeals: deals.length,
      totalDealVolume,
    };
  }

  async update(id: string, data: any, userId: string) {
    const oldDeal = await this.findOne(id);
    const changes: Record<string, { old: any; new: any }> = {};

    if (data.stageId && oldDeal.stageId !== data.stageId) {
      changes.stage = { old: oldDeal.stageId, new: data.stageId };
    }

    if (data.contactId !== undefined && oldDeal.contactId !== data.contactId) {
      changes.contact = {
        old: oldDeal.contactId,
        new: data.contactId,
      };
    }

    if (data.assignedToId && oldDeal.assignedToId !== data.assignedToId) {
      changes.assignee = { old: oldDeal.assignedToId, new: data.assignedToId };
    }

    const deal = await this.prisma.deal.update({
      where: { id },
      data,
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: true,
      },
    });

    // Log activities for changes
    if (changes.stage) {
      await this.activityService.create({
        type: ActivityType.STAGE_CHANGED,
        userId,
        dealId: deal.id,
        payload: {
          fromStage: changes.stage.old,
          toStage: changes.stage.new,
        },
      });

      // Emit WebSocket event for stage change
      const formattedDeal = await this.formatDealResponse(deal);
      this.websocketGateway.emitDealStageUpdated(deal.id, {
        dealId: deal.id,
        stageId: deal.stageId,
        stage: deal.stage,
        pipelineId: deal.pipelineId,
        pipeline: deal.pipeline,
        deal: formattedDeal,
      });
    }

    if (changes.contact) {
      const activityType = changes.contact.new
        ? ActivityType.CONTACT_LINKED
        : ActivityType.CONTACT_UNLINKED;
      
      await this.activityService.create({
        type: activityType,
        userId,
        dealId: deal.id,
        contactId: changes.contact.new || changes.contact.old,
        payload: {
          contactId: changes.contact.new || changes.contact.old,
          dealId: deal.id,
        },
      });

      // Emit WebSocket event for contact
      if (changes.contact.new) {
        this.websocketGateway.emitContactDealUpdated(
          changes.contact.new,
          deal.id,
          deal,
        );
      }
      if (changes.contact.old) {
        this.websocketGateway.emitContactDealUpdated(
          changes.contact.old,
          deal.id,
          deal,
        );
      }
    }

    // Handle company changes
    if (changes.company) {
      // Emit WebSocket events for company
      if (changes.company.new) {
        this.websocketGateway.emitCompanyDealUpdated(changes.company.new, deal.id, deal);
      }
      if (changes.company.old) {
        this.websocketGateway.emitCompanyDealUpdated(changes.company.old, deal.id, deal);
      }
    }

    // Log CONTACT_UPDATED_IN_DEAL if contact info changed in deal context
    if (deal.contactId && (changes.stage || changes.assignee || data.amount !== undefined)) {
      await this.activityService.create({
        type: ActivityType.CONTACT_UPDATED_IN_DEAL,
        userId,
        dealId: deal.id,
        contactId: deal.contactId,
        payload: {
          dealId: deal.id,
          contactId: deal.contactId,
          changes: Object.keys(changes),
        },
      });
    }

    if (changes.assignee) {
      await this.activityService.create({
        type: ActivityType.ASSIGNEE_CHANGED,
        userId,
        dealId: deal.id,
        payload: {
          fromUserId: changes.assignee.old,
          toUserId: changes.assignee.new,
        },
      });
    }

    // Emit WebSocket events
    this.websocketGateway.emitDealUpdated(deal.id, deal);
    if (changes.stage) {
      // Emit field update for stage change
      this.websocketGateway.emitDealFieldUpdated(deal.id, 'stageId', {
        oldValue: changes.stage.old,
        newValue: changes.stage.new,
      });
    }

    // If contact exists and deal was updated, emit contact.deal.updated
    if (deal.contactId) {
      this.websocketGateway.emitContactDealUpdated(deal.contactId, deal.id, deal);
    }

    // If company exists and deal was updated, emit company.deal.updated
    if (deal.companyId) {
      this.websocketGateway.emitCompanyDealUpdated(deal.companyId, deal.id, deal);
    }

    return this.formatDealResponse(deal);
  }

  async linkContact(dealId: string, contactId: string, userId: string) {
    const deal = await this.findOne(dealId);
    
    if (deal.contactId === contactId) {
      return this.formatDealResponse(deal);
    }

    const oldContactId = deal.contactId;

    const updatedDeal = await this.prisma.deal.update({
      where: { id: dealId },
      data: { contactId },
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: {
          include: {
            company: true,
          },
        },
      },
    });

    // Log activity
    if (oldContactId) {
      await this.activityService.create({
        type: ActivityType.CONTACT_UNLINKED,
        userId,
        dealId,
        contactId: oldContactId,
        payload: { contactId: oldContactId, dealId },
      });
    }

    await this.activityService.create({
      type: ActivityType.CONTACT_LINKED,
      userId,
      dealId,
      contactId,
      payload: { contactId, dealId },
    });

    // Emit WebSocket events
    this.websocketGateway.emitDealUpdated(dealId, updatedDeal);
    this.websocketGateway.emitContactDealUpdated(contactId, dealId, updatedDeal);
    if (oldContactId) {
      this.websocketGateway.emitContactDealUpdated(oldContactId, dealId, updatedDeal);
    }

    return this.formatDealResponse(updatedDeal);
  }

  async unlinkContact(dealId: string, userId: string) {
    const deal = await this.findOne(dealId);
    
    if (!deal.contactId) {
      return this.formatDealResponse(deal);
    }

    const oldContactId = deal.contactId;

    const updatedDeal = await this.prisma.deal.update({
      where: { id: dealId },
      data: { contactId: null },
      include: {
        stage: true,
        pipeline: true,
        createdBy: true,
        assignedTo: true,
        contact: null,
      },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.CONTACT_UNLINKED,
      userId,
      dealId,
      contactId: oldContactId,
      payload: { contactId: oldContactId, dealId },
    });

    // Emit WebSocket events
    this.websocketGateway.emitDealUpdated(dealId, updatedDeal);
    this.websocketGateway.emitContactDealUpdated(oldContactId, dealId, updatedDeal);

    return this.formatDealResponse(updatedDeal);
  }

  async remove(id: string) {
    return this.prisma.deal.delete({
      where: { id },
    });
  }
}

