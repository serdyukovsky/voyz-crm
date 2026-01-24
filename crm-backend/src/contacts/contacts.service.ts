import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { Contact, Prisma, ActivityType } from '@prisma/client';
import {
  normalizePhone,
  normalizeEmail,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly websocketGateway: RealtimeGateway,
    private readonly loggingService: LoggingService,
  ) {}

  async create(createContactDto: CreateContactDto, userId: string): Promise<ContactResponseDto> {
    // Normalize email
    const normalizedEmail = normalizeEmail(createContactDto.email);
    if (createContactDto.email && !normalizedEmail) {
      throw new BadRequestException('Invalid email format');
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(createContactDto.phone);
    if (createContactDto.phone && !normalizedPhone) {
      throw new BadRequestException('Invalid phone format');
    }

    // Normalize social links
    const normalizedSocial = normalizeSocialLinks(createContactDto.social);
    if (createContactDto.social && !normalizedSocial) {
      throw new BadRequestException('Invalid social links format');
    }

    // Check for duplicate email if provided
    if (normalizedEmail) {
      const existing = await this.prisma.contact.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new ConflictException('Contact with this email already exists');
      }
    }

    // Sync companyName from companyId if provided
    let companyName: string | undefined;
    if (createContactDto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: createContactDto.companyId },
        select: { name: true },
      });
      if (!company) {
        throw new BadRequestException(`Company with ID ${createContactDto.companyId} not found`);
      }
      companyName = company.name;
    }

    const contact = await this.prisma.contact.create({
      data: {
        fullName: sanitizeTextFields(createContactDto.fullName)!,
        email: normalizedEmail || undefined,
        phone: normalizedPhone || undefined,
        position: sanitizeOptionalTextFields(createContactDto.position),
        companyId: createContactDto.companyId,
        companyName,
        tags: createContactDto.tags || [],
        notes: sanitizeOptionalTextFields(createContactDto.notes),
        social: normalizedSocial ? (normalizedSocial as any) : {},
        // New fields
        link: sanitizeOptionalTextFields(createContactDto.link),
        subscriberCount: sanitizeOptionalTextFields(createContactDto.subscriberCount),
        directions: createContactDto.directions || [],
        contactMethods: createContactDto.contactMethods || [],
        websiteOrTgChannel: sanitizeOptionalTextFields(createContactDto.websiteOrTgChannel),
        contactInfo: sanitizeOptionalTextFields(createContactDto.contactInfo),
      },
      include: {
        company: true,
      },
    });

    // Emit company contact updated event if company exists
    if (contact.companyId) {
      this.websocketGateway.emitCompanyContactUpdated(contact.companyId, contact.id, contact);
    }

    // Log activity
    await this.activityService.create({
      type: ActivityType.CONTACT_CREATED,
      userId,
      contactId: contact.id,
      payload: {
        contactName: contact.fullName,
      },
    });

    // Log action
    try {
      // Get company name for metadata
      const company = contact.companyId ? await this.prisma.company.findUnique({
        where: { id: contact.companyId },
        select: { name: true },
      }) : null;
      
      await this.loggingService.create({
        level: 'info',
        action: 'create',
        entity: 'contact',
        entityId: contact.id,
        userId,
        message: `Contact "${contact.fullName}" created`,
        metadata: {
          contactName: contact.fullName,
          email: contact.email,
          companyId: contact.companyId,
          companyName: company?.name,
        },
      });
    } catch (logError) {
      console.error('ContactsService.create - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitContactCreated(contact.id, contact);

    // Return formatted response
    return this.formatContactResponse(contact);
  }

  async findAll(filters: ContactFilterDto) {
    const where: Prisma.ContactWhereInput = {};

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (filters.hasActiveDeals !== undefined) {
      // Оптимизация: удален ненужный count() запрос, который не использовался
      if (filters.hasActiveDeals) {
        where.deals = {
          some: {
            closedAt: null,
          },
        };
      } else {
        where.deals = {
          none: {
            closedAt: null,
          },
        };
      }
    }

    if (filters.hasClosedDeals !== undefined) {
      if (filters.hasClosedDeals) {
        where.deals = {
          some: {
            closedAt: { not: null },
          },
        };
      } else {
        where.deals = {
          none: {
            closedAt: { not: null },
          },
        };
      }
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        position: true,
        companyName: true,
        companyId: true,
        tags: true,
        notes: true,
        social: true,
        link: true,
        subscriberCount: true,
        directions: true,
        contactMethods: true,
        websiteOrTgChannel: true,
        contactInfo: true,
        createdAt: true,
        updatedAt: true,
        // company не используется в formatContactResponse, только companyName
        deals: {
          select: {
            id: true,
            closedAt: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format contacts with stats using mapper
    return Promise.all(
      contacts.map(async (contact) => this.formatContactResponse(contact)),
    );
  }

  async findOne(id: string): Promise<ContactResponseDto> {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      // company не используется в formatContactResponse, только companyName
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    // Return formatted contact response
    return this.formatContactResponse(contact);
  }

  async update(
    id: string,
    updateContactDto: any,
    userId: string,
  ): Promise<ContactResponseDto> {
    // Extract dealId if provided (for logging activity in deal context)
    const dealId = updateContactDto.dealId;
    console.log('[ContactsService.update] Received update with dealId:', { contactId: id, dealId, updateData: Object.keys(updateContactDto) });

    // Remove dealId from update data (it's metadata, not a contact field)
    const { dealId: _, ...updateData } = updateContactDto;

    const existing = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    // Normalize email if provided
    let normalizedEmail: string | undefined;
    if (updateData.email !== undefined) {
      if (updateData.email === null || updateData.email === '') {
        normalizedEmail = undefined;
      } else {
        const normalized = normalizeEmail(updateData.email);
        if (!normalized) {
          throw new BadRequestException('Invalid email format');
        }
        normalizedEmail = normalized;
      }
    }

    // Normalize phone if provided
    let normalizedPhone: string | undefined;
    if (updateData.phone !== undefined) {
      if (updateData.phone === null || updateData.phone === '') {
        normalizedPhone = undefined;
      } else {
        const normalized = normalizePhone(updateData.phone);
        if (!normalized) {
          throw new BadRequestException('Invalid phone format');
        }
        normalizedPhone = normalized;
      }
    }

    // Normalize social links if provided
    let normalizedSocial: any = undefined;
    if (updateData.social !== undefined) {
      if (updateData.social === null) {
        normalizedSocial = {};
      } else {
        const normalized = normalizeSocialLinks(updateData.social);
        if (!normalized) {
          throw new BadRequestException('Invalid social links format');
        }
        normalizedSocial = normalized;
      }
    }

    // Check for duplicate email if changing
    if (normalizedEmail && normalizedEmail !== existing.email) {
      const duplicate = await this.prisma.contact.findUnique({
        where: { email: normalizedEmail },
      });
      if (duplicate) {
        throw new ConflictException('Contact with this email already exists');
      }
    }

    // Track field changes for activity log
    const changes: Record<string, { old: any; new: any }> = {};

    if (updateData.fullName !== undefined) {
      const normalizedFullName = sanitizeTextFields(updateData.fullName);
      if (normalizedFullName && normalizedFullName !== existing.fullName) {
        changes.fullName = { old: existing.fullName, new: normalizedFullName };
      }
    }

    if (normalizedEmail !== undefined && normalizedEmail !== existing.email) {
      changes.email = { old: existing.email, new: normalizedEmail };
    }

    if (normalizedPhone !== undefined && normalizedPhone !== existing.phone) {
      changes.phone = { old: existing.phone, new: normalizedPhone };
    }

    // Build update data object with only provided fields
    const dbUpdateData: any = {};

    // Handle companyId changes
    if (updateData.companyId !== undefined && updateData.companyId !== existing.companyId) {
      // Sync companyName from companyId
      let companyName: string | undefined;
      if (updateData.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: updateData.companyId },
          select: { name: true },
        });
        if (!company) {
          throw new BadRequestException(`Company with ID ${updateData.companyId} not found`);
        }
        companyName = company.name;
      }
      changes.company = { old: existing.companyId, new: updateData.companyId };
      dbUpdateData.companyId = updateData.companyId;
      dbUpdateData.companyName = companyName;
    }

    if (updateData.fullName !== undefined) {
      const normalizedFullName = sanitizeTextFields(updateData.fullName);
      dbUpdateData.fullName = normalizedFullName || undefined;
    }
    if (normalizedEmail !== undefined) dbUpdateData.email = normalizedEmail;
    if (normalizedPhone !== undefined) dbUpdateData.phone = normalizedPhone;
    if (updateData.position !== undefined) {
      dbUpdateData.position = sanitizeOptionalTextFields(updateData.position);
    }
    if (updateData.tags !== undefined) dbUpdateData.tags = updateData.tags;
    if (updateData.notes !== undefined) {
      dbUpdateData.notes = sanitizeOptionalTextFields(updateData.notes);
    }
    if (normalizedSocial !== undefined) {
      dbUpdateData.social = normalizedSocial;
      if (JSON.stringify(normalizedSocial) !== JSON.stringify(existing.social)) {
        changes.social = { old: existing.social, new: normalizedSocial };
      }
    }

    // Handle new fields
    if (updateData.link !== undefined) {
      dbUpdateData.link = sanitizeOptionalTextFields(updateData.link);
      if (dbUpdateData.link !== existing.link) {
        changes.link = { old: existing.link, new: dbUpdateData.link };
      }
    }
    if (updateData.subscriberCount !== undefined) {
      dbUpdateData.subscriberCount = sanitizeOptionalTextFields(updateData.subscriberCount);
      if (dbUpdateData.subscriberCount !== existing.subscriberCount) {
        changes.subscriberCount = { old: existing.subscriberCount, new: dbUpdateData.subscriberCount };
      }
    }
    if (updateData.directions !== undefined) {
      dbUpdateData.directions = updateData.directions;
      console.log('[ContactsService.update] Checking directions:', {
        newValue: dbUpdateData.directions,
        oldValue: existing.directions,
        isSame: JSON.stringify(dbUpdateData.directions) === JSON.stringify(existing.directions),
      });
      if (JSON.stringify(dbUpdateData.directions) !== JSON.stringify(existing.directions)) {
        changes.directions = { old: existing.directions, new: dbUpdateData.directions };
      }
    }
    if (updateData.contactMethods !== undefined) {
      dbUpdateData.contactMethods = updateData.contactMethods;
      if (JSON.stringify(dbUpdateData.contactMethods) !== JSON.stringify(existing.contactMethods)) {
        changes.contactMethods = { old: existing.contactMethods, new: dbUpdateData.contactMethods };
      }
    }
    if (updateData.websiteOrTgChannel !== undefined) {
      dbUpdateData.websiteOrTgChannel = sanitizeOptionalTextFields(updateData.websiteOrTgChannel);
      if (dbUpdateData.websiteOrTgChannel !== existing.websiteOrTgChannel) {
        changes.websiteOrTgChannel = { old: existing.websiteOrTgChannel, new: dbUpdateData.websiteOrTgChannel };
      }
    }
    if (updateData.contactInfo !== undefined) {
      dbUpdateData.contactInfo = sanitizeOptionalTextFields(updateData.contactInfo);
      if (dbUpdateData.contactInfo !== existing.contactInfo) {
        changes.contactInfo = { old: existing.contactInfo, new: dbUpdateData.contactInfo };
      }
    }

    const contact = await this.prisma.contact.update({
      where: { id },
      data: dbUpdateData,
      include: {
        company: true,
      },
    });

    // Log activity for each changed field
    console.log('[ContactsService.update] Changes detected:', {
      changesCount: Object.keys(changes).length,
      changeFields: Object.keys(changes),
      dealId: dealId || 'undefined',
    });

    if (Object.keys(changes).length === 0) {
      console.log('[ContactsService.update] ⚠️ No changes detected, skipping activity log');
    }

    for (const [field, change] of Object.entries(changes)) {
      // If dealId provided, log as CONTACT_UPDATED_IN_DEAL, otherwise as CONTACT_UPDATED
      const activityType = dealId ? ActivityType.CONTACT_UPDATED_IN_DEAL : ActivityType.CONTACT_UPDATED;

      console.log('[ContactsService.update] ✅ Creating activity:', {
        type: activityType,
        contactId: id,
        dealId: dealId || 'undefined',
        field,
        oldValue: change.old,
        newValue: change.new,
      });

      await this.activityService.create({
        type: activityType,
        userId,
        contactId: id,
        dealId: dealId || undefined,
        payload: {
          field,
          oldValue: change.old,
          newValue: change.new,
        },
      });
    }

    // Log action
    try {
      const changeFields = Object.keys(changes);
      // Get company name for metadata
      const company = contact.companyId ? await this.prisma.company.findUnique({
        where: { id: contact.companyId },
        select: { name: true },
      }) : null;

      const contextInfo = dealId ? ` (in deal context)` : '';
      await this.loggingService.create({
        level: 'info',
        action: 'update',
        entity: 'contact',
        entityId: contact.id,
        userId,
        message: `Contact "${contact.fullName}" updated${changeFields.length > 0 ? `: ${changeFields.join(', ')}` : ''}${contextInfo}`,
        metadata: {
          contactName: contact.fullName,
          changes,
          companyId: contact.companyId,
          companyName: company?.name,
          dealId,
        },
      });
    } catch (logError) {
      console.error('ContactsService.update - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitContactUpdated(id, contact);

    // Return formatted response
    return this.formatContactResponse(contact);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Check if contact exists
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    await this.prisma.contact.delete({
      where: { id },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.CONTACT_DELETED,
      userId,
      contactId: id,
      payload: {
        contactName: contact.fullName,
      },
    });

    // Emit WebSocket event
    this.websocketGateway.emitContactDeleted(id);

    return { message: 'Contact deleted successfully' };
  }

  async getStats(id: string) {
    const deals = await this.prisma.deal.findMany({
      where: { contactId: id },
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

  async getTasks(contactId: string) {
    // Verify contact exists
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    return this.prisma.task.findMany({
      where: { contactId },
      include: {
        deal: {
          include: {
            stage: true,
          },
        },
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Format contact response with stats
   */
  private async formatContactResponse(contact: any): Promise<ContactResponseDto> {
    const stats = await this.getStats(contact.id);

    return {
      id: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      position: contact.position,
      companyName: contact.companyName,
      tags: contact.tags || [],
      notes: contact.notes,
      social: (contact.social as {
        instagram?: string;
        telegram?: string;
        whatsapp?: string;
        vk?: string;
      }) || undefined,
      // New fields
      link: contact.link || undefined,
      subscriberCount: contact.subscriberCount || undefined,
      directions: contact.directions || [],
      contactMethods: contact.contactMethods || [],
      websiteOrTgChannel: contact.websiteOrTgChannel || undefined,
      contactInfo: contact.contactInfo || undefined,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      stats,
    };
  }

}

