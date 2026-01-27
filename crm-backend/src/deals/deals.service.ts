import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { CustomFieldsService } from '@/custom-fields/custom-fields.service';
import { Deal, ActivityType, UserRole, Prisma } from '@prisma/client';
import { PaginationCursor, PaginatedResponse } from '@/common/dto/pagination.dto';
import { BulkDeleteDto, BulkDeleteResult, BulkDeleteMode } from './dto/bulk-delete.dto';
import { BulkAssignDto, BulkAssignResult, BulkAssignMode } from './dto/bulk-assign.dto';

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
      // Extract IDs from objects if needed (defensive programming)
      const extractId = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value.id) return String(value.id);
        return null;
      };

      // Ensure required fields have defaults
      const dealData = {
        title: data.title || 'New Deal',
        amount: data.amount !== undefined && data.amount !== null ? Number(data.amount) : 0,
        pipelineId: extractId(data.pipelineId) || data.pipelineId,
        stageId: extractId(data.stageId) || data.stageId,
        createdById: userId,
        assignedToId: extractId(data.assignedToId) || data.assignedToId || null,
        contactId: extractId(data.contactId) || data.contactId || null,
        companyId: extractId(data.companyId) || data.companyId || null,
        description: data.description || null,
        expectedCloseAt: data.expectedCloseAt || null,
        rejectionReasons: data.rejectionReasons || [],
      };

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
    } catch (activityError) {
      console.error('DealsService.create - failed to create activity:', activityError);
      // Don't fail the deal creation if activity creation fails
    }

    // Log action
    try {
      // Use already loaded stage and pipeline data (optimization: avoid extra queries)
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
          stageName: deal.stage?.name,
          pipelineId: deal.pipelineId,
          pipelineName: deal.pipeline?.name,
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
      } catch (wsError) {
        console.error('DealsService.create - failed to emit WebSocket events:', wsError);
        // Don't fail the request if WebSocket fails
      }
      
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
          name: `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` || 'Unknown User',
        } : null,
        createdBy: deal.createdBy ? {
          id: deal.createdBy.id,
          name: `${deal.createdBy.firstName} ${deal.createdBy.lastName}` || 'Unknown User',
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

  /**
   * Encode cursor to base64 string
   */
  private encodeCursor(cursor: PaginationCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  /**
   * Decode cursor from base64 string
   */
  private decodeCursor(cursorString: string): PaginationCursor | null {
    try {
      const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
      const cursor = JSON.parse(decoded) as PaginationCursor;
      if (!cursor.updatedAt || !cursor.id) {
        return null;
      }
      return cursor;
    } catch (error) {
      return null;
    }
  }

  private buildWhere(filters?: {
    pipelineId?: string;
    stageId?: string;
    stageIds?: string[];
    assignedToId?: string;
    contactId?: string;
    companyId?: string;
    createdById?: string;
    search?: string;
    title?: string;
    number?: string;
    description?: string;
    amountMin?: number;
    amountMax?: number;
    budgetMin?: number;
    budgetMax?: number;
    dateFrom?: string;
    dateTo?: string;
    dateType?: 'created' | 'closed' | 'expectedClose';
    expectedCloseFrom?: string;
    expectedCloseTo?: string;
    tags?: string[];
    rejectionReasons?: string[];
    activeStagesOnly?: boolean;
    contactSubscriberCountMin?: number;
    contactSubscriberCountMax?: number;
    contactDirections?: string[];
    taskStatuses?: string[];
  }): Prisma.DealWhereInput {
    const where: Prisma.DealWhereInput = {};
    const andFilters: Prisma.DealWhereInput[] = [];

    // Build stage IDs filter
    const stageIds = new Set<string>();
    if (filters?.stageId) stageIds.add(filters.stageId);
    if (filters?.stageIds?.length) {
      filters.stageIds.forEach(id => stageIds.add(id));
    }

    // Add all direct filters to where object (these are simple equality/inclusion filters)
    if (filters?.pipelineId) where.pipelineId = filters.pipelineId;
    if (stageIds.size > 0) where.stageId = { in: Array.from(stageIds) };
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.contactId) where.contactId = filters.contactId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.createdById) where.createdById = filters.createdById;
    if (filters?.tags?.length) where.tags = { hasSome: filters.tags };
    if (filters?.rejectionReasons?.length) where.rejectionReasons = { hasSome: filters.rejectionReasons };

    // Add complex filters to andFilters (these need special handling)
    if (filters?.activeStagesOnly) {
      andFilters.push({ stage: { isClosed: false } });
    }

    const contactFilter: Prisma.ContactWhereInput = {};
    if (filters?.contactDirections?.length) {
      contactFilter.directions = { hasSome: filters.contactDirections };
    }
    if (filters?.contactSubscriberCountMin !== undefined || filters?.contactSubscriberCountMax !== undefined) {
      const range: Prisma.StringFilter = {};
      if (filters.contactSubscriberCountMin !== undefined) {
        range.gte = String(filters.contactSubscriberCountMin);
      }
      if (filters.contactSubscriberCountMax !== undefined) {
        range.lte = String(filters.contactSubscriberCountMax);
      }
      contactFilter.subscriberCount = range;
    }
    if (Object.keys(contactFilter).length > 0) {
      andFilters.push({ contact: contactFilter });
    }

    if (filters?.title) {
      andFilters.push({ title: { contains: filters.title, mode: 'insensitive' } });
    }

    if (filters?.number) {
      andFilters.push({ number: { contains: filters.number, mode: 'insensitive' } });
    }

    if (filters?.description) {
      andFilters.push({ description: { contains: filters.description, mode: 'insensitive' } });
    }

    if (filters?.search) {
      andFilters.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters?.amountMin !== undefined || filters?.amountMax !== undefined) {
      const range: Prisma.DecimalFilter = {};
      if (filters.amountMin !== undefined) range.gte = filters.amountMin;
      if (filters.amountMax !== undefined) range.lte = filters.amountMax;
      andFilters.push({ amount: range });
    }

    if (filters?.budgetMin !== undefined || filters?.budgetMax !== undefined) {
      const range: Prisma.DecimalNullableFilter = {};
      if (filters.budgetMin !== undefined) range.gte = filters.budgetMin;
      if (filters.budgetMax !== undefined) range.lte = filters.budgetMax;
      andFilters.push({ budget: range });
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
      if (filters.dateTo) range.lte = new Date(filters.dateTo);
      const dateField =
        filters.dateType === 'closed'
          ? 'closedAt'
          : filters.dateType === 'expectedClose'
            ? 'expectedCloseAt'
            : 'createdAt';
      andFilters.push({ [dateField]: range } as Prisma.DealWhereInput);
    }

    if (filters?.expectedCloseFrom || filters?.expectedCloseTo) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.expectedCloseFrom) range.gte = new Date(filters.expectedCloseFrom);
      if (filters.expectedCloseTo) range.lte = new Date(filters.expectedCloseTo);
      andFilters.push({ expectedCloseAt: range });
    }

    // Task status filtering
    if (filters?.taskStatuses?.length) {
      const now = new Date();
      // Use UTC dates to match database dates (which are stored in UTC)
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2);
      const endOfDayAfterTomorrow = new Date(dayAfterTomorrow);
      endOfDayAfterTomorrow.setUTCDate(endOfDayAfterTomorrow.getUTCDate() + 1);

      // End of week (Sunday)
      const endOfWeek = new Date(today);
      const dayOfWeek = today.getUTCDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      endOfWeek.setUTCDate(endOfWeek.getUTCDate() + daysUntilSunday + 1);

      // End of month
      const endOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

      // End of quarter
      const currentQuarter = Math.floor(today.getUTCMonth() / 3);
      const endOfQuarter = new Date(Date.UTC(today.getUTCFullYear(), (currentQuarter + 1) * 3, 1));

      const taskConditions: Prisma.DealWhereInput[] = [];

      for (const status of filters.taskStatuses) {
        switch (status) {
          case 'today':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: today, lt: tomorrow } },
                  ],
                },
              },
            });
            break;
          case 'tomorrow':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: tomorrow, lt: dayAfterTomorrow } },
                  ],
                },
              },
            });
            break;
          case 'dayAfterTomorrow':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: dayAfterTomorrow, lt: endOfDayAfterTomorrow } },
                  ],
                },
              },
            });
            break;
          case 'thisWeek':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: today, lt: endOfWeek } },
                  ],
                },
              },
            });
            break;
          case 'thisMonth':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: today, lt: endOfMonth } },
                  ],
                },
              },
            });
            break;
          case 'thisQuarter':
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { gte: today, lt: endOfQuarter } },
                  ],
                },
              },
            });
            break;
          case 'noTasks':
            // Deals with no active (non-DONE) tasks - must not have any TODO, IN_PROGRESS, or OVERDUE tasks
            taskConditions.push({
              tasks: {
                none: {
                  status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] },
                },
              },
            });
            break;
          case 'overdue':
            // Deals with tasks that are overdue (deadline in the past and status not DONE)
            taskConditions.push({
              tasks: {
                some: {
                  AND: [
                    { status: { in: ['TODO', 'IN_PROGRESS', 'OVERDUE'] } },
                    { deadline: { not: null } },
                    { deadline: { lt: today } },
                  ],
                },
              },
            });
            break;
        }
      }

      if (taskConditions.length > 0) {
        andFilters.push({ OR: taskConditions });
      }
    }

    // Combine all filters
    if (andFilters.length > 0) {
      // If there are already direct filters in where, merge them with andFilters
      if (Object.keys(where).length > 0) {
        // Convert direct where conditions to andFilters format
        const directFilters: Prisma.DealWhereInput = { ...where };
        where.AND = [...andFilters, directFilters];
        // Remove direct properties to avoid duplication
        Object.keys(where).forEach(key => {
          if (key !== 'AND') delete where[key];
        });
      } else {
        where.AND = andFilters;
      }
    }

    return where;
  }

  async findAll(filters?: {
    pipelineId?: string;
    stageId?: string;
    stageIds?: string[];
    assignedToId?: string;
    contactId?: string;
    companyId?: string;
    createdById?: string;
    search?: string;
    title?: string;
    number?: string;
    description?: string;
    amountMin?: number;
    amountMax?: number;
    budgetMin?: number;
    budgetMax?: number;
    dateFrom?: string;
    dateTo?: string;
    dateType?: 'created' | 'closed' | 'expectedClose';
    expectedCloseFrom?: string;
    expectedCloseTo?: string;
    tags?: string[];
    rejectionReasons?: string[];
    activeStagesOnly?: boolean;
    contactSubscriberCountMin?: number;
    contactSubscriberCountMax?: number;
    contactDirections?: string[];
    taskStatuses?: string[];
    limit?: number;
    cursor?: string; // base64 encoded cursor
  }): Promise<PaginatedResponse<any>> {
    // Debug logging for task status filtering
    if (filters?.taskStatuses?.length) {
      console.log('📋 Filtering by taskStatuses:', filters.taskStatuses);
    }

    const where = this.buildWhere(filters);

    // Debug: Log the where condition when filtering by tasks
    if (filters?.taskStatuses?.length) {
      console.log('📋 WHERE condition:', JSON.stringify(where, null, 2));
    }

    // Managers can see all deals (no filtering by user)

    // Hard limit for performance (optimization: prevent loading all deals)
    // Allow up to 10000 deals per request for kanban boards
    // Default limit is 50 if not specified
    const requestedLimit = filters?.limit || 50;
    const limit = Math.min(requestedLimit, 10000);
    const take = limit + 1; // +1 to check if hasMore

    // Decode cursor if provided
    const decodedCursor = filters?.cursor ? this.decodeCursor(filters.cursor) : null;

    // Add cursor condition for pagination
    if (decodedCursor) {
      const cursorCondition = {
        OR: [
          { updatedAt: { lt: new Date(decodedCursor.updatedAt) } },
          {
            updatedAt: new Date(decodedCursor.updatedAt),
            id: { lt: decodedCursor.id },
          },
        ],
      };

      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push(cursorCondition);
      } else if (where.AND) {
        where.AND = [where.AND as Prisma.DealWhereInput, cursorCondition];
      } else {
        where.AND = [cursorCondition];
      }
    }

    // Use select instead of include to avoid overfetching (optimization: load only needed fields)
    const deals = await this.prisma.deal.findMany({
      where,
      select: {
        id: true,
        number: true,
        title: true,
        amount: true,
        budget: true,
        stageId: true,
        pipelineId: true,
        assignedToId: true,
        createdById: true,
        contactId: true,
        companyId: true,
        expectedCloseAt: true,
        closedAt: true,
        description: true,
        updatedAt: true,
        createdAt: true,
        tags: true,
        rejectionReasons: true,
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            isClosed: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            position: true,
            companyName: true,
            link: true,
            subscriberCount: true,
            directions: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            deadline: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }, // Secondary sort for stable pagination
      ],
      take,
    });

    // Calculate total count (only if cursor is not provided, to avoid performance issues)
    // When cursor is provided, we skip total count calculation for performance
    let total: number | undefined = undefined;
    if (!decodedCursor) {
      try {
        total = await this.prisma.deal.count({ where });
      } catch (error) {
        console.error('Failed to count deals:', error);
        // Continue without total if count fails
      }
    }

    // Debug logging for task filtering
    if (filters?.taskStatuses?.length) {
      console.log('📋 Query returned', deals.length, 'deals with taskStatuses filter');
    }

    // Always return paginated response format (even if empty)
    if (deals.length === 0) {
      if (filters?.taskStatuses?.length) {
        console.log('📋 No deals found matching taskStatuses filter');
      }
      return { data: [], nextCursor: undefined, hasMore: false, total };
    }

    // Check if there are more items
    const hasMore = deals.length > limit;
    const data = hasMore ? deals.slice(0, limit) : deals;

    // Format deals without stats (optimization: stats not needed for list view)
    const formattedDeals = data.map((deal) => this.formatDealResponseForList(deal));

    // Always return paginated response if limit is specified (or using default limit)
    // This allows frontend to show "Load More" button even on first load
    const lastDeal = data[data.length - 1];
    const nextCursor = hasMore && lastDeal
      ? this.encodeCursor({
          updatedAt: lastDeal.updatedAt.toISOString(),
          id: lastDeal.id,
        })
      : undefined;

    return {
      data: formattedDeals,
      nextCursor,
      hasMore,
      total,
    };
  }

  async findOne(id: string) {
    // ⚡ PERFORMANCE TEST: Measure execution time
    const perfStart = Date.now();
    const perfLog: Array<{ step: string; time: number; ms: number }> = [];
    
    const perfLogStep = (step: string) => {
      const now = Date.now();
      const elapsed = now - perfStart;
      perfLog.push({ step, time: now, ms: elapsed });
    };

    perfLogStep('start');
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        title: true,
        amount: true,
        budget: true,
        pipelineId: true,
        stageId: true,
        assignedToId: true,
        createdById: true,
        contactId: true,
        companyId: true,
        expectedCloseAt: true,
        closedAt: true,
        description: true,
        tags: true,
        rejectionReasons: true,
        createdAt: true,
        updatedAt: true,
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            isClosed: true,
          },
        },
        pipeline: {
          select: {
            id: true,
            name: true,
            description: true,
            isDefault: true,
            isActive: true,
            order: true,
            createdAt: true,
            updatedAt: true,
            stages: {
              select: {
                id: true,
                name: true,
                order: true,
                color: true,
                isDefault: true,
                isClosed: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            position: true,
            companyName: true,
            link: true,
            subscriberCount: true,
            directions: true,
            contactMethods: true,
            websiteOrTgChannel: true,
            contactInfo: true,
            social: true,
            company: {
              select: {
                id: true,
                name: true,
                industry: true,
                website: true,
                email: true,
                phone: true,
                address: true,
                notes: true,
                social: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            website: true,
            email: true,
            phone: true,
            address: true,
            notes: true,
            social: true,
          },
        },
        customFieldValues: {
          select: {
            id: true,
            customFieldId: true,
            value: true,
            customField: {
              select: {
                id: true,
                name: true,
                key: true,
                type: true,
                group: true,
                order: true,
                isRequired: true,
                description: true,
                options: true,
                defaultValue: true,
              },
            },
          },
        },
        // НЕ загружаем tasks, comments, activities, files - они загружаются отдельно через хуки на фронтенде
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    perfLogStep('deal.findUnique complete');

    // Managers can see all deals (no filtering)

    const result = await this.formatDealResponse(deal, undefined, undefined, undefined, perfLogStep);
    
    perfLogStep('formatDealResponse complete');
    const totalTime = Date.now() - perfStart;
    
    // ⚡ PERFORMANCE LOG: Output timing information
    console.log(`\n⚡ DEAL FINDONE PERFORMANCE [${id}]:`);
    console.log(`  Total time: ${totalTime}ms`);
    if (perfLog.length > 1) {
      perfLog.forEach((log, index) => {
        if (index > 0) {
          const prevLog = perfLog[index - 1];
          const stepTime = log.ms - prevLog.ms;
          console.log(`  ${log.step}: +${stepTime}ms (total: ${log.ms}ms)`);
        }
      });
    }
    console.log('');
    
    return result;
  }

  /**
   * Format deal response for list view (optimized - no stats, no customFields, no pipeline)
   */
  private formatDealResponseForList(deal: any) {
    return {
      id: deal.id,
      number: deal.number || null,
      title: deal.title || 'Untitled Deal',
      amount: deal.amount ? Number(deal.amount) : 0,
      budget: deal.budget ? Number(deal.budget) : null,
      stageId: deal.stageId || deal.stage?.id || '',
      pipelineId: deal.pipelineId,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      contactId: deal.contactId,
      companyId: deal.companyId,
      tags: deal.tags || [],
      rejectionReasons: deal.rejectionReasons || [],
      description: deal.description || null,
      expectedCloseAt: deal.expectedCloseAt || null,
      closedAt: deal.closedAt || null,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      tasks: deal.tasks ? deal.tasks.map((task: any) => ({
        id: task.id,
        status: task.status || 'TODO',
        deadline: task.deadline || null,
      })) : [],
      stage: deal.stage ? {
        id: deal.stage.id,
        name: deal.stage.name || 'Unknown Stage',
        color: deal.stage.color || '#6B7280',
        order: deal.stage.order || 0,
        isClosed: deal.stage.isClosed || false,
      } : null,
      assignedTo: deal.assignedTo ? {
        id: deal.assignedTo.id,
        name: `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() || 'Unknown User',
        avatar: deal.assignedTo.avatar || null,
      } : null,
      contact: deal.contact ? {
        id: deal.contact.id,
        fullName: deal.contact.fullName || 'Unknown Contact',
        email: deal.contact.email || null,
        phone: deal.contact.phone || null,
        position: deal.contact.position || null,
        companyName: deal.contact.companyName || null,
        link: deal.contact.link || null,
        subscriberCount: deal.contact.subscriberCount || null,
        directions: deal.contact.directions || [],
        company: deal.contact.company || null,
      } : null,
      company: deal.company ? {
        id: deal.company.id,
        name: deal.company.name || 'Unknown Company',
        industry: deal.company.industry || null,
      } : null,
    };
  }

  private async formatDealResponse(
    deal: any, 
    allCustomFields?: any[],
    contactStatsMap?: Map<string, any>,
    companyStatsMap?: Map<string, any>,
    perfLogStep?: (step: string) => void
  ) {
    try {
      perfLogStep?.('formatDealResponse.start');
      const result: any = { 
        ...deal,
        // Ensure amount is always a number, default to 0 if null/undefined
        amount: deal.amount ? Number(deal.amount) : 0,
        // Ensure title is never null/undefined
        title: deal.title || 'Untitled Deal',
        // Ensure stageId exists
        stageId: deal.stageId || deal.stage?.id || '',
        // Explicitly include rejectionReasons
        rejectionReasons: deal.rejectionReasons || [],
      };

      // Add contact with stats if contact exists
      if (deal.contact) {
        try {
          perfLogStep?.('contactStats.load.start');
          // Use batch-loaded stats if available, otherwise load individually
          const contactStats = contactStatsMap?.get(deal.contact.id) || 
            (contactStatsMap ? null : await this.getContactStats(deal.contact.id));
          perfLogStep?.('contactStats.load.complete');
          
          // If stats not found in batch map, use default (shouldn't happen, but safe fallback)
          const stats = contactStats || { activeDeals: 0, closedDeals: 0, totalDeals: 0, totalDealVolume: 0 };
          
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
            stats: stats,
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
          perfLogStep?.('companyStats.load.start');
          // Use batch-loaded stats if available, otherwise load individually
          const companyStats = companyStatsMap?.get(deal.company.id) || 
            (companyStatsMap ? null : await this.getCompanyStats(deal.company.id));
          perfLogStep?.('companyStats.load.complete');
          
          // If stats not found in batch map, use default (shouldn't happen, but safe fallback)
          const stats = companyStats || { totalDeals: 0, activeDeals: 0, closedDeals: 0, totalDealVolume: 0 };
          
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
            stats: stats,
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
        name: `${result.assignedTo.firstName} ${result.assignedTo.lastName}` || 'Unknown User',
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
        perfLogStep?.('customFields.load.start');
        // Use provided custom fields or load them (optimization: avoid N+1 query in findAll)
        const customFields = allCustomFields || await this.customFieldsService.findByEntity('deal');
        perfLogStep?.('customFields.load.complete');
        
        // Create a map of field values by customFieldId for quick lookup
        const fieldValuesMap = new Map<string, any>();
        if (deal.customFieldValues && Array.isArray(deal.customFieldValues)) {
          deal.customFieldValues.forEach((fieldValue: any) => {
            if (fieldValue.customFieldId) {
              fieldValuesMap.set(fieldValue.customFieldId, fieldValue.value);
            }
          });
        }

        // Merge all custom fields with their values
        result.customFields = customFields.map((field: any) => {
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
          name: `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` || 'Unknown User',
        } : null,
        stage: deal.stage ? {
          id: deal.stage.id,
          name: deal.stage.name || 'Unknown Stage',
          color: deal.stage.color || '#6B7280',
        } : null,
      };
    }
  }

  /**
   * Get company stats - OPTIMIZED: uses aggregate instead of findMany + filter
   * This is 10-100x faster for companies with many deals
   */
  private async getCompanyStats(companyId: string) {
    // Use aggregate for efficient counting and summing on database level
    const [totalStats, closedStats] = await Promise.all([
      // Total deals count
      this.prisma.deal.aggregate({
        where: { companyId },
        _count: { id: true },
      }),
      // Closed deals count and volume (closedAt is not null)
      this.prisma.deal.aggregate({
        where: { 
          companyId,
          closedAt: { not: null },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const totalDeals = totalStats._count.id;
    const closedDeals = closedStats._count.id;
    const activeDeals = totalDeals - closedDeals;
    const totalDealVolume = Number(closedStats._sum.amount || 0);

    return {
      totalDeals,
      activeDeals,
      closedDeals,
      totalDealVolume,
    };
  }

  /**
   * Batch load contact stats for multiple contacts - OPTIMIZED: uses groupBy instead of findMany
   * This is 10-100x faster for contacts with many deals
   */
  private async getContactStatsBatch(contactIds: string[]): Promise<Map<string, any>> {
    if (contactIds.length === 0) {
      return new Map();
    }

    // Use groupBy for efficient aggregation on database level
    const [totalStats, closedStats] = await Promise.all([
      // Total deals count per contact
      this.prisma.deal.groupBy({
        by: ['contactId'],
        where: { contactId: { in: contactIds } },
        _count: { id: true },
      }),
      // Closed deals count and volume per contact
      this.prisma.deal.groupBy({
        by: ['contactId'],
        where: { 
          contactId: { in: contactIds },
          closedAt: { not: null },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Initialize stats map
    const statsMap = new Map<string, any>();
    contactIds.forEach(id => {
      statsMap.set(id, {
        activeDeals: 0,
        closedDeals: 0,
        totalDeals: 0,
        totalDealVolume: 0,
      });
    });

    // Fill in total deals
    totalStats.forEach(stat => {
      if (!stat.contactId) return;
      const stats = statsMap.get(stat.contactId);
      if (stats) {
        stats.totalDeals = stat._count.id;
      }
    });

    // Fill in closed deals count and volume
    closedStats.forEach(stat => {
      if (!stat.contactId) return;
      const stats = statsMap.get(stat.contactId);
      if (stats) {
        stats.closedDeals = stat._count.id;
        stats.totalDealVolume = Number(stat._sum.amount || 0);
        stats.activeDeals = stats.totalDeals - stats.closedDeals;
      }
    });

    // Calculate active deals for contacts without closed deals
    statsMap.forEach((stats, contactId) => {
      if (stats.closedDeals === 0) {
        stats.activeDeals = stats.totalDeals;
      }
    });

    return statsMap;
  }

  /**
   * Batch load company stats for multiple companies - OPTIMIZED: uses groupBy instead of findMany
   * This is 10-100x faster for companies with many deals
   */
  private async getCompanyStatsBatch(companyIds: string[]): Promise<Map<string, any>> {
    if (companyIds.length === 0) {
      return new Map();
    }

    // Use groupBy for efficient aggregation on database level
    const [totalStats, closedStats] = await Promise.all([
      // Total deals count per company
      this.prisma.deal.groupBy({
        by: ['companyId'],
        where: { companyId: { in: companyIds } },
        _count: { id: true },
      }),
      // Closed deals count and volume per company
      this.prisma.deal.groupBy({
        by: ['companyId'],
        where: { 
          companyId: { in: companyIds },
          closedAt: { not: null },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Initialize stats map
    const statsMap = new Map<string, any>();
    companyIds.forEach(id => {
      statsMap.set(id, {
        totalDeals: 0,
        activeDeals: 0,
        closedDeals: 0,
        totalDealVolume: 0,
      });
    });

    // Fill in total deals
    totalStats.forEach(stat => {
      if (!stat.companyId) return;
      const stats = statsMap.get(stat.companyId);
      if (stats) {
        stats.totalDeals = stat._count.id;
      }
    });

    // Fill in closed deals count and volume
    closedStats.forEach(stat => {
      if (!stat.companyId) return;
      const stats = statsMap.get(stat.companyId);
      if (stats) {
        stats.closedDeals = stat._count.id;
        stats.totalDealVolume = Number(stat._sum.amount || 0);
        stats.activeDeals = stats.totalDeals - stats.closedDeals;
      }
    });

    // Calculate active deals for companies without closed deals
    statsMap.forEach((stats, companyId) => {
      if (stats.closedDeals === 0) {
        stats.activeDeals = stats.totalDeals;
      }
    });

    return statsMap;
  }

  /**
   * Get contact stats - OPTIMIZED: uses aggregate instead of findMany + filter
   * This is 10-100x faster for contacts with many deals
   */
  private async getContactStats(contactId: string) {
    // Use aggregate for efficient counting and summing on database level
    const [totalStats, closedStats] = await Promise.all([
      // Total deals count
      this.prisma.deal.aggregate({
        where: { contactId },
        _count: { id: true },
      }),
      // Closed deals count and volume (closedAt is not null)
      this.prisma.deal.aggregate({
        where: { 
          contactId,
          closedAt: { not: null },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const totalDeals = totalStats._count.id;
    const closedDeals = closedStats._count.id;
    const activeDeals = totalDeals - closedDeals;
    const totalDealVolume = Number(closedStats._sum.amount || 0);

    return {
      activeDeals,
      closedDeals,
      totalDeals,
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
      // Use already loaded stage and pipeline data (optimization: avoid extra queries)
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
          stageName: deal.stage?.name,
          pipelineId: deal.pipelineId,
          pipelineName: deal.pipeline?.name,
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

  /**
   * Count deals matching filters (for bulk operations)
   */
  async count(filters?: {
    pipelineId?: string;
    stageId?: string;
    stageIds?: string[];
    assignedToId?: string;
    contactId?: string;
    companyId?: string;
    createdById?: string;
    search?: string;
    title?: string;
    number?: string;
    description?: string;
    amountMin?: number;
    amountMax?: number;
    budgetMin?: number;
    budgetMax?: number;
    dateFrom?: string;
    dateTo?: string;
    dateType?: 'created' | 'closed' | 'expectedClose';
    expectedCloseFrom?: string;
    expectedCloseTo?: string;
    tags?: string[];
    rejectionReasons?: string[];
    activeStagesOnly?: boolean;
    contactSubscriberCountMin?: number;
    contactSubscriberCountMax?: number;
    contactDirections?: string[];
  }): Promise<number> {
    const where = this.buildWhere(filters);
    return this.prisma.deal.count({ where });
  }

  /**
   * Bulk delete deals by IDs or filters
   * Deletes in batches of 1000 to avoid timeout
   */
  async bulkDelete(dto: BulkDeleteDto, userId: string): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = {
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    if (dto.mode === BulkDeleteMode.IDS) {
      // Delete by specific IDs
      if (!dto.ids || dto.ids.length === 0) {
        return result;
      }

      // Delete in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < dto.ids.length; i += batchSize) {
        const batch = dto.ids.slice(i, i + batchSize);
        
        try {
          // Use transaction for each batch
          await this.prisma.$transaction(async (tx) => {
            // Get deals before deletion for logging
            const dealsToDelete = await tx.deal.findMany({
              where: { id: { in: batch } },
              select: { id: true, title: true, number: true },
            });

            // Delete deals
            await tx.deal.deleteMany({
              where: { id: { in: batch } },
            });

            // Log each deletion
            for (const deal of dealsToDelete) {
              try {
                await this.loggingService.create({
                  level: 'info',
                  action: 'delete',
                  entity: 'deal',
                  entityId: deal.id,
                  userId,
                  message: `Deal "${deal.title || deal.number || deal.id}" deleted (bulk)`,
                  metadata: {
                    dealTitle: deal.title,
                    dealNumber: deal.number,
                    bulkOperation: true,
                  },
                });
              } catch (logError) {
                console.error(`Failed to log deletion for deal ${deal.id}:`, logError);
              }
            }
          });

          result.deletedCount += batch.length;
        } catch (error) {
          console.error(`Failed to delete batch starting at index ${i}:`, error);
          result.failedCount += batch.length;
          batch.forEach((id) => {
            result.errors?.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        }
      }
    } else if (dto.mode === BulkDeleteMode.FILTER) {
      // Delete by filter
      if (!dto.filter) {
        throw new Error('Filter is required for FILTER mode');
      }

      const where: any = {};

      // Build filter (same as findAll)
      if (dto.filter.pipelineId) where.pipelineId = dto.filter.pipelineId;
      if (dto.filter.stageId) where.stageId = dto.filter.stageId;
      if (dto.filter.assignedToId) where.assignedToId = dto.filter.assignedToId;
      if (dto.filter.contactId) where.contactId = dto.filter.contactId;
      if (dto.filter.companyId) where.companyId = dto.filter.companyId;
      if (dto.filter.search) {
        where.OR = [
          { title: { contains: dto.filter.search, mode: 'insensitive' } },
          { description: { contains: dto.filter.search, mode: 'insensitive' } },
        ];
      }

      // Exclude specific IDs if provided
      if (dto.excludedIds && dto.excludedIds.length > 0) {
        where.id = { notIn: dto.excludedIds };
      }

      // Delete in batches to avoid timeout
      const batchSize = 1000;
      let hasMore = true;
      let deletedInBatch = 0;

      while (hasMore) {
        try {
          // Get batch of IDs to delete
          const dealsBatch = await this.prisma.deal.findMany({
            where,
            select: { id: true, title: true, number: true },
            take: batchSize,
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          });

          if (dealsBatch.length === 0) {
            hasMore = false;
            break;
          }

          const batchIds = dealsBatch.map((d) => d.id);

          // Delete batch in transaction
          await this.prisma.$transaction(async (tx) => {
            await tx.deal.deleteMany({
              where: { id: { in: batchIds } },
            });

            // Log each deletion
            for (const deal of dealsBatch) {
              try {
                await this.loggingService.create({
                  level: 'info',
                  action: 'delete',
                  entity: 'deal',
                  entityId: deal.id,
                  userId,
                  message: `Deal "${deal.title || deal.number || deal.id}" deleted (bulk filter)`,
                  metadata: {
                    dealTitle: deal.title,
                    dealNumber: deal.number,
                    bulkOperation: true,
                    filterMode: true,
                  },
                });
              } catch (logError) {
                console.error(`Failed to log deletion for deal ${deal.id}:`, logError);
              }
            }
          });

          deletedInBatch = dealsBatch.length;
          result.deletedCount += deletedInBatch;

          // If we got less than batchSize, we're done
          if (dealsBatch.length < batchSize) {
            hasMore = false;
          }
        } catch (error) {
          console.error('Failed to delete batch in FILTER mode:', error);
          result.failedCount += batchSize; // Estimate
          hasMore = false;
        }
      }
    }

    return result;
  }

  /**
   * Bulk update assignee for deals by IDs or filters
   * Updates in batches of 1000 to avoid timeout
   */
  async bulkAssign(dto: BulkAssignDto, userId: string): Promise<BulkAssignResult> {
    const result: BulkAssignResult = {
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };

    if (dto.assignedToId === undefined) {
      throw new Error('assignedToId is required');
    }

    const assignedToId = dto.assignedToId === '' ? null : dto.assignedToId;

    if (dto.mode === BulkAssignMode.IDS) {
      if (!dto.ids || dto.ids.length === 0) {
        return result;
      }

      const batchSize = 1000;
      for (let i = 0; i < dto.ids.length; i += batchSize) {
        const batch = dto.ids.slice(i, i + batchSize);

        try {
          await this.prisma.$transaction(async (tx) => {
            const dealsToUpdate = await tx.deal.findMany({
              where: { id: { in: batch } },
              select: { id: true, title: true, number: true },
            });

            await tx.deal.updateMany({
              where: { id: { in: batch } },
              data: { assignedToId },
            });

            for (const deal of dealsToUpdate) {
              try {
                await this.loggingService.create({
                  level: 'info',
                  action: 'update',
                  entity: 'deal',
                  entityId: deal.id,
                  userId,
                  message: `Deal "${deal.title || deal.number || deal.id}" assignee updated (bulk)`,
                  metadata: {
                    dealTitle: deal.title,
                    dealNumber: deal.number,
                    bulkOperation: true,
                    assignedToId: assignedToId,
                  },
                });
              } catch (logError) {
                console.error(`Failed to log assignee update for deal ${deal.id}:`, logError);
              }
            }
          });

          result.updatedCount += batch.length;
        } catch (error) {
          console.error(`Failed to update assignee for batch starting at index ${i}:`, error);
          result.failedCount += batch.length;
          batch.forEach((id) => {
            result.errors?.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        }
      }
    } else if (dto.mode === BulkAssignMode.FILTER) {
      if (!dto.filter) {
        throw new Error('Filter is required for FILTER mode');
      }

      const where: any = {};
      if (dto.filter.pipelineId) where.pipelineId = dto.filter.pipelineId;
      if (dto.filter.stageId) where.stageId = dto.filter.stageId;
      if (dto.filter.assignedToId) where.assignedToId = dto.filter.assignedToId;
      if (dto.filter.contactId) where.contactId = dto.filter.contactId;
      if (dto.filter.companyId) where.companyId = dto.filter.companyId;
      if (dto.filter.search) {
        where.OR = [
          { title: { contains: dto.filter.search, mode: 'insensitive' } },
          { description: { contains: dto.filter.search, mode: 'insensitive' } },
        ];
      }

      if (dto.excludedIds && dto.excludedIds.length > 0) {
        where.id = { notIn: dto.excludedIds };
      }

      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        try {
          const dealsBatch = await this.prisma.deal.findMany({
            where,
            select: { id: true, title: true, number: true },
            take: batchSize,
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          });

          if (dealsBatch.length === 0) {
            hasMore = false;
            break;
          }

          const batchIds = dealsBatch.map((d) => d.id);

          await this.prisma.$transaction(async (tx) => {
            await tx.deal.updateMany({
              where: { id: { in: batchIds } },
              data: { assignedToId },
            });

            for (const deal of dealsBatch) {
              try {
                await this.loggingService.create({
                  level: 'info',
                  action: 'update',
                  entity: 'deal',
                  entityId: deal.id,
                  userId,
                  message: `Deal "${deal.title || deal.number || deal.id}" assignee updated (bulk filter)`,
                  metadata: {
                    dealTitle: deal.title,
                    dealNumber: deal.number,
                    bulkOperation: true,
                    filterMode: true,
                    assignedToId: assignedToId,
                  },
                });
              } catch (logError) {
                console.error(`Failed to log assignee update for deal ${deal.id}:`, logError);
              }
            }
          });

          result.updatedCount += dealsBatch.length;

          if (dealsBatch.length < batchSize) {
            hasMore = false;
          }
        } catch (error) {
          console.error('Failed to update assignee batch in FILTER mode:', error);
          result.failedCount += batchSize;
          hasMore = false;
        }
      }
    }

    return result;
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

