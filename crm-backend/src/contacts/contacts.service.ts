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
    updateContactDto: UpdateContactDto,
    userId: string,
  ): Promise<ContactResponseDto> {
    const existing = await this.prisma.contact.findUnique({
      where: { id },
    });
    
    if (!existing) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    // Normalize email if provided
    let normalizedEmail: string | undefined;
    if (updateContactDto.email !== undefined) {
      if (updateContactDto.email === null || updateContactDto.email === '') {
        normalizedEmail = undefined;
      } else {
        const normalized = normalizeEmail(updateContactDto.email);
        if (!normalized) {
          throw new BadRequestException('Invalid email format');
        }
        normalizedEmail = normalized;
      }
    }

    // Normalize phone if provided
    let normalizedPhone: string | undefined;
    if (updateContactDto.phone !== undefined) {
      if (updateContactDto.phone === null || updateContactDto.phone === '') {
        normalizedPhone = undefined;
      } else {
        const normalized = normalizePhone(updateContactDto.phone);
        if (!normalized) {
          throw new BadRequestException('Invalid phone format');
        }
        normalizedPhone = normalized;
      }
    }

    // Normalize social links if provided
    let normalizedSocial: any = undefined;
    if (updateContactDto.social !== undefined) {
      if (updateContactDto.social === null) {
        normalizedSocial = {};
      } else {
        const normalized = normalizeSocialLinks(updateContactDto.social);
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

    if (updateContactDto.fullName !== undefined) {
      const normalizedFullName = sanitizeTextFields(updateContactDto.fullName);
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
    const updateData: any = {};

    // Handle companyId changes
    if (updateContactDto.companyId !== undefined && updateContactDto.companyId !== existing.companyId) {
      // Sync companyName from companyId
      let companyName: string | undefined;
      if (updateContactDto.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: updateContactDto.companyId },
          select: { name: true },
        });
        if (!company) {
          throw new BadRequestException(`Company with ID ${updateContactDto.companyId} not found`);
        }
        companyName = company.name;
      }
      changes.company = { old: existing.companyId, new: updateContactDto.companyId };
      updateData.companyId = updateContactDto.companyId;
      updateData.companyName = companyName;
    }

    if (updateContactDto.fullName !== undefined) {
      const normalizedFullName = sanitizeTextFields(updateContactDto.fullName);
      updateData.fullName = normalizedFullName || undefined;
    }
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (normalizedPhone !== undefined) updateData.phone = normalizedPhone;
    if (updateContactDto.position !== undefined) {
      updateData.position = sanitizeOptionalTextFields(updateContactDto.position);
    }
    if (updateContactDto.tags !== undefined) updateData.tags = updateContactDto.tags;
    if (updateContactDto.notes !== undefined) {
      updateData.notes = sanitizeOptionalTextFields(updateContactDto.notes);
    }
    if (normalizedSocial !== undefined) {
      updateData.social = normalizedSocial;
      if (JSON.stringify(normalizedSocial) !== JSON.stringify(existing.social)) {
        changes.social = { old: existing.social, new: normalizedSocial };
      }
    }

    // Handle new fields
    if (updateContactDto.link !== undefined) {
      updateData.link = sanitizeOptionalTextFields(updateContactDto.link);
      if (updateData.link !== existing.link) {
        changes.link = { old: existing.link, new: updateData.link };
      }
    }
    if (updateContactDto.subscriberCount !== undefined) {
      updateData.subscriberCount = sanitizeOptionalTextFields(updateContactDto.subscriberCount);
      if (updateData.subscriberCount !== existing.subscriberCount) {
        changes.subscriberCount = { old: existing.subscriberCount, new: updateData.subscriberCount };
      }
    }
    if (updateContactDto.directions !== undefined) {
      updateData.directions = updateContactDto.directions;
      if (JSON.stringify(updateData.directions) !== JSON.stringify(existing.directions)) {
        changes.directions = { old: existing.directions, new: updateData.directions };
      }
    }
    if (updateContactDto.contactMethods !== undefined) {
      updateData.contactMethods = updateContactDto.contactMethods;
      if (JSON.stringify(updateData.contactMethods) !== JSON.stringify(existing.contactMethods)) {
        changes.contactMethods = { old: existing.contactMethods, new: updateData.contactMethods };
      }
    }
    if (updateContactDto.websiteOrTgChannel !== undefined) {
      updateData.websiteOrTgChannel = sanitizeOptionalTextFields(updateContactDto.websiteOrTgChannel);
      if (updateData.websiteOrTgChannel !== existing.websiteOrTgChannel) {
        changes.websiteOrTgChannel = { old: existing.websiteOrTgChannel, new: updateData.websiteOrTgChannel };
      }
    }
    if (updateContactDto.contactInfo !== undefined) {
      updateData.contactInfo = sanitizeOptionalTextFields(updateContactDto.contactInfo);
      if (updateData.contactInfo !== existing.contactInfo) {
        changes.contactInfo = { old: existing.contactInfo, new: updateData.contactInfo };
      }
    }

    const contact = await this.prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        company: true,
      },
    });

    // Log activity for each changed field
    for (const [field, change] of Object.entries(changes)) {
      await this.activityService.create({
        type: ActivityType.CONTACT_UPDATED,
        userId,
        contactId: id,
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
      
      await this.loggingService.create({
        level: 'info',
        action: 'update',
        entity: 'contact',
        entityId: contact.id,
        userId,
        message: `Contact "${contact.fullName}" updated${changeFields.length > 0 ? `: ${changeFields.join(', ')}` : ''}`,
        metadata: {
          contactName: contact.fullName,
          changes,
          companyId: contact.companyId,
          companyName: company?.name,
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

