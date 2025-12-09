import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { CustomFieldsService } from '@/custom-fields/custom-fields.service';
import { Deal, ActivityType } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly websocketGateway: RealtimeGateway,
    private readonly loggingService: LoggingService,
    private readonly customFieldsService: CustomFieldsService,
  ) {}

  async create(data: any, userId: string) {
    try {
      console.log('DealsService.create called with:', { data, userId });
      
      // Ensure required fields have defaults
      const dealData = {
        title: data.title || 'New Deal',
        amount: data.amount !== undefined && data.amount !== null ? Number(data.amount) : 0,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        createdById: userId,
        assignedToId: data.assignedToId || null,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        description: data.description || null,
        expectedCloseAt: data.expectedCloseAt || null,
        rejectionReasons: data.rejectionReasons || [],
      };

      console.log('DealsService.create - dealData:', dealData);

      // Validate required fields
      if (!dealData.pipelineId) {
        console.error('DealsService.create - pipelineId is missing');
        throw new Error('pipelineId is required');
      }
      if (!dealData.stageId) {
        console.error('DealsService.create - stageId is missing');
        throw new Error('stageId is required');
      }

      // Verify that stage exists and belongs to pipeline
      const stage = await this.prisma.stage.findUnique({
        where: { id: dealData.stageId },
        include: { pipeline: true },
      });

      if (!stage) {
        console.error('DealsService.create - stage not found:', dealData.stageId);
        throw new Error(`Stage with id ${dealData.stageId} not found`);
      }

      if (stage.pipelineId !== dealData.pipelineId) {
        console.error('DealsService.create - stage does not belong to pipeline:', {
          stagePipelineId: stage.pipelineId,
          dealPipelineId: dealData.pipelineId,
        });
        throw new Error(`Stage does not belong to the specified pipeline`);
      }

      // Generate unique deal number
      const dealNumber = await this.generateDealNumber();

      console.log('DealsService.create - generated deal number:', dealNumber);
      console.log('DealsService.create - creating deal in database...');
      const deal = await this.prisma.deal.create({
      data: {
        ...dealData,
        number: dealNumber,
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
        company: true,
      },
    });

    console.log('DealsService.create - deal created successfully:', deal.id);

    // Create activity
    try {
      await this.activityService.create({
        type: ActivityType.DEAL_CREATED,
        userId,
        dealId: deal.id,
        contactId: deal.contactId || undefined,
        payload: {
          dealTitle: deal.title,
        },
      });
      console.log('DealsService.create - activity created');
    } catch (activityError) {
      console.error('DealsService.create - failed to create activity:', activityError);
      // Don't fail the deal creation if activity creation fails
    }

    // Log action
    try {
      // Get stage and pipeline names for metadata
      const stage = await this.prisma.stage.findUnique({
        where: { id: deal.stageId },
        select: { name: true },
      });
      const pipeline = await this.prisma.pipeline.findUnique({
        where: { id: deal.pipelineId },
        select: { name: true },
      });
      
      await this.loggingService.create({
        level: 'info',
        action: 'create',
        entity: 'deal',
        entityId: deal.id,
        userId,
        message: `Deal "${deal.title}" created`,
        metadata: {
          dealTitle: deal.title,
          dealNumber: deal.number,
          amount: deal.amount,
          stageId: deal.stageId,
          stageName: stage?.name,
          pipelineId: deal.pipelineId,
          pipelineName: pipeline?.name,
        },
      });
    } catch (logError) {
      console.error('DealsService.create - failed to create log:', logError);
    }

    // Format and return deal response
    try {
      const formattedDeal = await this.formatDealResponse(deal);
      
      // Emit WebSocket events (don't fail if this fails)
      try {
        this.websocketGateway.emitDealUpdated(deal.id, formattedDeal);
        if (deal.contactId) {
          this.websocketGateway.emitContactDealUpdated(deal.contactId, deal.id, formattedDeal);
        }
        console.log('DealsService.create - WebSocket events emitted');
      } catch (wsError) {
        console.error('DealsService.create - failed to emit WebSocket events:', wsError);
        // Don't fail the request if WebSocket fails
      }
      
      console.log('DealsService.create - returning formatted deal');
      return formattedDeal;
    } catch (formatError) {
      console.error('DealsService.create - failed to format deal:', formatError);
      console.error('DealsService.create - format error stack:', formatError instanceof Error ? formatError.stack : 'No stack');
      
      // Return basic deal structure even if formatting fails
      // Deal is already created, so we return success with basic data
      const basicDeal = {
        id: deal.id,
        number: deal.number,
        title: deal.title || 'Untitled Deal',
        amount: deal.amount ? Number(deal.amount) : 0,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        createdById: deal.createdById,
        assignedToId: deal.assignedToId,
        contactId: deal.contactId,
        companyId: deal.companyId,
        description: deal.description,
        expectedCloseAt: deal.expectedCloseAt,
        closedAt: deal.closedAt,
        tags: deal.tags || [],
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        stage: deal.stage ? {
          id: deal.stage.id,
          name: deal.stage.name || 'Unknown Stage',
          color: deal.stage.color || '#6B7280',
          order: deal.stage.order || 0,
          isClosed: deal.stage.isClosed || false,
        } : null,
        pipeline: deal.pipeline ? {
          id: deal.pipeline.id,
          name: deal.pipeline.name || 'Unknown Pipeline',
        } : null,
        contact: deal.contact ? {
          id: deal.contact.id,
          fullName: deal.contact.fullName || 'Unknown Contact',
          email: deal.contact.email || null,
          phone: deal.contact.phone || null,
        } : null,
        company: deal.company ? {
          id: deal.company.id,
          name: deal.company.name || 'Unknown Company',
        } : null,
        assignedTo: deal.assignedTo ? {
          id: deal.assignedTo.id,
          name: deal.assignedTo.name || deal.assignedTo.fullName || 'Unknown User',
        } : null,
        createdBy: deal.createdBy ? {
          id: deal.createdBy.id,
          name: deal.createdBy.name || deal.createdBy.fullName || 'Unknown User',
        } : null,
      };
      
      // Try to emit WebSocket with basic data
      try {
        this.websocketGateway.emitDealUpdated(deal.id, basicDeal);
        if (deal.contactId) {
          this.websocketGateway.emitContactDealUpdated(deal.contactId, deal.id, basicDeal);
        }
      } catch (wsError) {
        // Ignore WebSocket errors
      }
      
      return basicDeal;
    }
    } catch (error) {
      console.error('DealsService.create - error:', error);
      console.error('DealsService.create - error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
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
        pipeline: {
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
          },
        },
        createdBy: true,
        assignedTo: true,
        contact: {
          include: {
            company: true,
          },
        },
        company: true,
        customFieldValues: {
          include: { customField: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Always return an array, even if empty
    // Format deals with contact stats and null-safe handling
    if (deals.length === 0) {
      return [];
    }

    return Promise.all(deals.map((deal) => this.formatDealResponse(deal)));
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        pipeline: {
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
          },
        },
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
    try {
      const result: any = { 
        ...deal,
        // Ensure amount is always a number, default to 0 if null/undefined
        amount: deal.amount ? Number(deal.amount) : 0,
        // Ensure title is never null/undefined
        title: deal.title || 'Untitled Deal',
        // Ensure stageId exists
        stageId: deal.stageId || deal.stage?.id || '',
      };

      // Add contact with stats if contact exists
      if (deal.contact) {
        try {
          const contactStats = await this.getContactStats(deal.contact.id);
          result.contact = {
            id: deal.contact.id,
            fullName: deal.contact.fullName || 'Unknown Contact',
            email: deal.contact.email || null,
            phone: deal.contact.phone || null,
            position: deal.contact.position || null,
            companyName: deal.contact.companyName || null,
            company: deal.contact.company || null,
            social: (deal.contact.social && typeof deal.contact.social === 'object') 
              ? deal.contact.social 
              : ({} as {
                instagram?: string;
                telegram?: string;
                whatsapp?: string;
                vk?: string;
              }),
            // New fields
            link: deal.contact.link || null,
            subscriberCount: deal.contact.subscriberCount || null,
            directions: deal.contact.directions || [],
            contactMethods: deal.contact.contactMethods || [],
            websiteOrTgChannel: deal.contact.websiteOrTgChannel || null,
            contactInfo: deal.contact.contactInfo || null,
            stats: contactStats,
          };
        } catch (contactError) {
          console.error('formatDealResponse - failed to get contact stats:', contactError);
          // Return contact without stats if stats fail
          result.contact = {
            id: deal.contact.id,
            fullName: deal.contact.fullName || 'Unknown Contact',
            email: deal.contact.email || null,
            phone: deal.contact.phone || null,
            position: deal.contact.position || null,
            companyName: deal.contact.companyName || null,
            company: deal.contact.company || null,
            social: (deal.contact.social && typeof deal.contact.social === 'object') 
              ? deal.contact.social 
              : {},
            stats: { dealsCount: 0, totalAmount: 0, closedDealsCount: 0, closedAmount: 0 },
          };
        }
      } else {
        result.contact = null;
      }

      // Add company with stats if company exists
      if (deal.company) {
        try {
          const companyStats = await this.getCompanyStats(deal.company.id);
          result.company = {
            id: deal.company.id,
            name: deal.company.name || 'Unknown Company',
            industry: deal.company.industry || null,
            website: deal.company.website || null,
            email: deal.company.email || null,
            phone: deal.company.phone || null,
            social: (deal.company.social && typeof deal.company.social === 'object') 
              ? deal.company.social 
              : {},
            address: deal.company.address || null,
            notes: deal.company.notes || null,
            stats: companyStats,
          };
        } catch (companyError) {
          console.error('formatDealResponse - failed to get company stats:', companyError);
          // Return company without stats if stats fail
          result.company = {
            id: deal.company.id,
            name: deal.company.name || 'Unknown Company',
            industry: deal.company.industry || null,
            website: deal.company.website || null,
            email: deal.company.email || null,
            phone: deal.company.phone || null,
            social: (deal.company.social && typeof deal.company.social === 'object') 
              ? deal.company.social 
              : {},
            address: deal.company.address || null,
            notes: deal.company.notes || null,
            stats: { dealsCount: 0, totalAmount: 0, closedDealsCount: 0, closedAmount: 0 },
          };
        }
      } else {
        result.company = null;
      }

    // Ensure assignedTo has proper structure
    if (result.assignedTo) {
      result.assignedTo = {
        id: result.assignedTo.id,
        name: result.assignedTo.name || result.assignedTo.fullName || 'Unknown User',
        avatar: result.assignedTo.avatar || null,
      };
    } else {
      result.assignedTo = null;
    }

      // Ensure stage exists
      if (result.stage) {
        result.stage = {
          id: result.stage.id,
          name: result.stage.name || 'Unknown Stage',
          color: result.stage.color || '#6B7280',
          order: result.stage.order || 0,
          isClosed: result.stage.isClosed || false,
        };
      }

      // Ensure pipeline includes stages
      if (result.pipeline) {
        result.pipeline = {
          id: result.pipeline.id,
          name: result.pipeline.name || 'Unknown Pipeline',
          description: result.pipeline.description || null,
          isDefault: result.pipeline.isDefault || false,
          isActive: result.pipeline.isActive !== undefined ? result.pipeline.isActive : true,
          order: result.pipeline.order || 0,
          stages: result.pipeline.stages ? result.pipeline.stages.map((stage: any) => ({
            id: stage.id,
            name: stage.name || 'Unknown Stage',
            order: stage.order || 0,
            color: stage.color || '#6B7280',
            isDefault: stage.isDefault || false,
            isClosed: stage.isClosed || false,
            createdAt: stage.createdAt || null,
            updatedAt: stage.updatedAt || null,
          })) : [],
          createdAt: result.pipeline.createdAt || null,
          updatedAt: result.pipeline.updatedAt || null,
        };
      }

      // Load and merge custom fields
      try {
        // Get all active custom fields for deals
        const allCustomFields = await this.customFieldsService.findByEntity('deal');
        console.log(`formatDealResponse - Found ${allCustomFields.length} custom fields for deal ${deal.id}`);
        
        // Create a map of field values by customFieldId for quick lookup
        const fieldValuesMap = new Map<string, any>();
        if (deal.customFieldValues && Array.isArray(deal.customFieldValues)) {
          console.log(`formatDealResponse - Found ${deal.customFieldValues.length} custom field values for deal ${deal.id}`);
          deal.customFieldValues.forEach((fieldValue: any) => {
            if (fieldValue.customFieldId) {
              fieldValuesMap.set(fieldValue.customFieldId, fieldValue.value);
            }
          });
        } else {
          console.log(`formatDealResponse - No custom field values found for deal ${deal.id}`);
        }

        // Merge all custom fields with their values
        console.log(`formatDealResponse - Merging ${allCustomFields.length} custom fields for deal ${deal.id}`);
        result.customFields = allCustomFields.map((field: any) => {
          const value = fieldValuesMap.get(field.id) ?? field.defaultValue ?? null;
          
          // Parse options if it's a JSON string
          let options = undefined;
          if (field.options) {
            if (Array.isArray(field.options)) {
              options = field.options;
            } else if (typeof field.options === 'string') {
              try {
                options = JSON.parse(field.options);
              } catch (e) {
                console.warn(`Failed to parse options for field ${field.id}:`, e);
                options = undefined;
              }
            } else {
              options = field.options;
            }
          }
          
          // Convert type from uppercase enum to lowercase for frontend
          // Also convert BOOLEAN to checkbox
          let type = field.type?.toLowerCase() || 'text';
          if (type === 'boolean') {
            type = 'checkbox';
          } else if (type === 'multi_select') {
            type = 'multi-select';
          }
          
          return {
            id: field.id,
            name: field.name,
            key: field.key,
            type: type,
            value: value,
            options: options,
            group: field.group || 'other',
            order: field.order || 0,
            isRequired: field.isRequired || false,
            description: field.description || null,
          };
        }).sort((a: any, b: any) => {
          // Sort by group first, then by order
          if (a.group !== b.group) {
            return (a.group || 'other').localeCompare(b.group || 'other');
          }
          return (a.order || 0) - (b.order || 0);
        });
        console.log(`formatDealResponse - Final custom fields count for deal ${deal.id}: ${result.customFields.length}`);
      } catch (customFieldsError) {
        console.error('formatDealResponse - failed to load custom fields:', customFieldsError);
        console.error('formatDealResponse - custom fields error stack:', customFieldsError instanceof Error ? customFieldsError.stack : 'No stack');
        // Return empty array if custom fields loading fails
        result.customFields = [];
      }

      return result;
    } catch (error) {
      console.error('formatDealResponse - error:', error);
      console.error('formatDealResponse - error stack:', error instanceof Error ? error.stack : 'No stack');
      // Return basic deal structure even if formatting fails
      return {
        ...deal,
        amount: deal.amount ? Number(deal.amount) : 0,
        title: deal.title || 'Untitled Deal',
        stageId: deal.stageId || deal.stage?.id || '',
        contact: deal.contact ? {
          id: deal.contact.id,
          fullName: deal.contact.fullName || 'Unknown Contact',
          email: deal.contact.email || null,
          phone: deal.contact.phone || null,
        } : null,
        company: deal.company ? {
          id: deal.company.id,
          name: deal.company.name || 'Unknown Company',
        } : null,
        assignedTo: deal.assignedTo ? {
          id: deal.assignedTo.id,
          name: deal.assignedTo.name || deal.assignedTo.fullName || 'Unknown User',
        } : null,
        stage: deal.stage ? {
          id: deal.stage.id,
          name: deal.stage.name || 'Unknown Stage',
          color: deal.stage.color || '#6B7280',
        } : null,
      };
    }
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
      // Get stage names for better activity display
      // Use the raw stageId from changes, not from formatted deal
      const oldStageId = changes.stage.old;
      const newStageId = changes.stage.new;
      
      const [oldStage, newStage] = await Promise.all([
        oldStageId ? this.prisma.stage.findUnique({
          where: { id: oldStageId },
          select: { name: true },
        }) : null,
        newStageId ? this.prisma.stage.findUnique({
          where: { id: newStageId },
          select: { name: true },
        }) : null,
      ]);

      await this.activityService.create({
        type: ActivityType.STAGE_CHANGED,
        userId,
        dealId: deal.id,
        payload: {
          fromStage: oldStage?.name || oldStageId,
          toStage: newStage?.name || newStageId,
          fromStageId: oldStageId,
          toStageId: newStageId,
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

    // Log DEAL_UPDATED for general updates
    const hasSignificantChanges = changes.stage || changes.contact || changes.company || changes.assignee || 
      (data.amount !== undefined && oldDeal.amount !== data.amount) ||
      (data.title !== undefined && oldDeal.title !== data.title);
    
    if (hasSignificantChanges) {
      await this.activityService.create({
        type: ActivityType.DEAL_UPDATED,
        userId,
        dealId: deal.id,
        payload: {
          changes: Object.keys(changes),
          dealTitle: deal.title,
        },
      });
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

    // Log action
    try {
      const changeFields = Object.keys(changes);
      // Get stage and pipeline names for metadata
      const stage = await this.prisma.stage.findUnique({
        where: { id: deal.stageId },
        select: { name: true },
      });
      const pipeline = await this.prisma.pipeline.findUnique({
        where: { id: deal.pipelineId },
        select: { name: true },
      });
      
      await this.loggingService.create({
        level: 'info',
        action: 'update',
        entity: 'deal',
        entityId: deal.id,
        userId,
        message: `Deal "${deal.title}" updated${changeFields.length > 0 ? `: ${changeFields.join(', ')}` : ''}`,
        metadata: {
          dealTitle: deal.title,
          dealNumber: deal.number,
          changes,
          stageId: deal.stageId,
          stageName: stage?.name,
          pipelineId: deal.pipelineId,
          pipelineName: pipeline?.name,
        },
      });
    } catch (logError) {
      console.error('DealsService.update - failed to create log:', logError);
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

  async remove(id: string, userId: string) {
    const deal = await this.findOne(id);
    const dealTitle = deal.title || deal.number || id;
    
    await this.prisma.deal.delete({
      where: { id },
    });

    // Log action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'delete',
        entity: 'deal',
        entityId: id,
        userId,
        message: `Deal "${dealTitle}" deleted`,
        metadata: {
          dealTitle: deal.title || dealTitle,
          dealNumber: deal.number,
        },
      });
    } catch (logError) {
      console.error('DealsService.remove - failed to create log:', logError);
    }

    return { id };
  }

  /**
   * Generate a unique deal number
   * Format: DEAL-YYYYMMDD-XXXXX (e.g., DEAL-20241201-00001)
   */
  private async generateDealNumber(): Promise<string> {
    const date = new Date();
    const datePrefix = `DEAL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    // Find the highest number for today
    const todayDeals = await this.prisma.deal.findMany({
      where: {
        number: {
          startsWith: datePrefix,
        },
      },
      orderBy: {
        number: 'desc',
      },
      take: 1,
    });

    let sequence = 1;
    if (todayDeals.length > 0) {
      // Extract sequence number from last deal number
      const lastNumber = todayDeals[0].number;
      const lastSequence = parseInt(lastNumber.split('-')[2] || '0', 10);
      sequence = lastSequence + 1;
    }

    const dealNumber = `${datePrefix}-${String(sequence).padStart(5, '0')}`;
    
    // Double-check uniqueness (race condition protection)
    const existing = await this.prisma.deal.findUnique({
      where: { number: dealNumber },
    });

    if (existing) {
      // If exists, try with timestamp + random
      return `${datePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    return dealNumber;
  }
}

