import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyFilterDto } from './dto/company-filter.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { ActivityService } from '@/activity/activity.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { LoggingService } from '@/logging/logging.service';
import { Company, Prisma, ActivityType } from '@prisma/client';
import {
  normalizePhone,
  normalizeEmail,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly websocketGateway: RealtimeGateway,
    private readonly loggingService: LoggingService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, userId: string): Promise<CompanyResponseDto> {
    // Normalize email
    const normalizedEmail = normalizeEmail(createCompanyDto.email);
    if (createCompanyDto.email && !normalizedEmail) {
      throw new BadRequestException('Invalid email format');
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(createCompanyDto.phone);
    if (createCompanyDto.phone && !normalizedPhone) {
      throw new BadRequestException('Invalid phone format');
    }

    // Normalize social links
    const normalizedSocial = normalizeSocialLinks(createCompanyDto.social);
    if (createCompanyDto.social && !normalizedSocial) {
      throw new BadRequestException('Invalid social links format');
    }

    // Check for duplicate name
    const normalizedName = sanitizeTextFields(createCompanyDto.name)!;
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Company with this name already exists');
    }

    const company = await this.prisma.company.create({
      data: {
        name: normalizedName,
        website: sanitizeOptionalTextFields(createCompanyDto.website),
        industry: sanitizeOptionalTextFields(createCompanyDto.industry),
        email: normalizedEmail || undefined,
        phone: normalizedPhone || undefined,
        social: normalizedSocial ? (normalizedSocial as any) : {},
        address: sanitizeOptionalTextFields(createCompanyDto.address),
        notes: sanitizeOptionalTextFields(createCompanyDto.notes),
        employees: createCompanyDto.employees,
      },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.COMPANY_CREATED,
      userId,
      payload: {
        companyName: company.name,
      },
    });

    // Log action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'create',
        entity: 'company',
        entityId: company.id,
        userId,
        message: `Company "${company.name}" created`,
        metadata: {
          companyName: company.name,
          industry: company.industry,
        },
      });
    } catch (logError) {
      console.error('CompaniesService.create - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitCompanyCreated(company.id, company);

    // Return formatted response
    return this.formatCompanyResponse(company);
  }

  async findAll(filters: CompanyFilterDto): Promise<CompanyResponseDto[]> {
    const where: Prisma.CompanyWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { industry: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.industry) {
      where.industry = { contains: filters.industry, mode: 'insensitive' };
    }

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Format companies with stats
    return Promise.all(
      companies.map(async (company) => this.formatCompanyResponse(company)),
    );
  }

  async findOne(id: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        contacts: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            position: true,
          },
        },
        deals: {
          select: {
            id: true,
            title: true,
            amount: true,
            closedAt: true,
            stage: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Return formatted company response
    return this.formatCompanyResponse(company);
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId: string,
  ): Promise<CompanyResponseDto> {
    const existing = await this.findOne(id);

    // Normalize email if provided
    let normalizedEmail: string | undefined;
    if (updateCompanyDto.email !== undefined) {
      if (updateCompanyDto.email === null || updateCompanyDto.email === '') {
        normalizedEmail = undefined;
      } else {
        const normalized = normalizeEmail(updateCompanyDto.email);
        if (!normalized) {
          throw new BadRequestException('Invalid email format');
        }
        normalizedEmail = normalized;
      }
    }

    // Normalize phone if provided
    let normalizedPhone: string | undefined;
    if (updateCompanyDto.phone !== undefined) {
      if (updateCompanyDto.phone === null || updateCompanyDto.phone === '') {
        normalizedPhone = undefined;
      } else {
        const normalized = normalizePhone(updateCompanyDto.phone);
        if (!normalized) {
          throw new BadRequestException('Invalid phone format');
        }
        normalizedPhone = normalized;
      }
    }

    // Normalize social links if provided
    let normalizedSocial: any = undefined;
    if (updateCompanyDto.social !== undefined) {
      if (updateCompanyDto.social === null) {
        normalizedSocial = {};
      } else {
        const normalized = normalizeSocialLinks(updateCompanyDto.social);
        if (!normalized) {
          throw new BadRequestException('Invalid social links format');
        }
        normalizedSocial = normalized;
      }
    }

    // Normalize name if provided
    let normalizedName: string | undefined;
    if (updateCompanyDto.name !== undefined) {
      const normalized = sanitizeTextFields(updateCompanyDto.name);
      if (!normalized) {
        throw new BadRequestException('Company name cannot be empty');
      }
      normalizedName = normalized;
    }

    // Check for duplicate name if changing
    if (normalizedName && normalizedName !== existing.name) {
      const duplicate = await this.prisma.company.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException('Company with this name already exists');
      }
    }

    // Track field changes for activity log
    const changes: Record<string, { old: any; new: any }> = {};

    if (normalizedName !== undefined && normalizedName !== existing.name) {
      changes.name = { old: existing.name, new: normalizedName };
    }

    if (normalizedEmail !== undefined && normalizedEmail !== existing.email) {
      changes.email = { old: existing.email, new: normalizedEmail };
    }

    if (normalizedPhone !== undefined && normalizedPhone !== existing.phone) {
      changes.phone = { old: existing.phone, new: normalizedPhone };
    }

    if (updateCompanyDto.industry !== undefined) {
      const normalizedIndustry = sanitizeOptionalTextFields(updateCompanyDto.industry);
      if (normalizedIndustry !== existing.industry) {
        changes.industry = { old: existing.industry, new: normalizedIndustry };
      }
    }

    if (normalizedSocial !== undefined && JSON.stringify(normalizedSocial) !== JSON.stringify(existing.social)) {
      changes.social = { old: existing.social, new: normalizedSocial };
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (normalizedName !== undefined) updateData.name = normalizedName;
    if (updateCompanyDto.website !== undefined) {
      updateData.website = sanitizeOptionalTextFields(updateCompanyDto.website);
    }
    if (updateCompanyDto.industry !== undefined) {
      updateData.industry = sanitizeOptionalTextFields(updateCompanyDto.industry);
    }
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (normalizedPhone !== undefined) updateData.phone = normalizedPhone;
    if (normalizedSocial !== undefined) updateData.social = normalizedSocial;
    if (updateCompanyDto.address !== undefined) {
      updateData.address = sanitizeOptionalTextFields(updateCompanyDto.address);
    }
    if (updateCompanyDto.notes !== undefined) {
      updateData.notes = sanitizeOptionalTextFields(updateCompanyDto.notes);
    }
    if (updateCompanyDto.employees !== undefined) updateData.employees = updateCompanyDto.employees;

    const company = await this.prisma.company.update({
      where: { id },
      data: updateData,
    });

    // Log activity for each changed field
    for (const [field, change] of Object.entries(changes)) {
      await this.activityService.create({
        type: ActivityType.COMPANY_UPDATED,
        userId,
        payload: {
          companyId: id,
          companyName: company.name,
          field,
          oldValue: change.old,
          newValue: change.new,
        },
      });
    }

    // Log action
    try {
      const changeFields = Object.keys(changes);
      await this.loggingService.create({
        level: 'info',
        action: 'update',
        entity: 'company',
        entityId: company.id,
        userId,
        message: `Company "${company.name}" updated${changeFields.length > 0 ? `: ${changeFields.join(', ')}` : ''}`,
        metadata: {
          companyName: company.name,
          changes,
        },
      });
    } catch (logError) {
      console.error('CompaniesService.update - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitCompanyUpdated(id, company);

    // Return formatted response
    return this.formatCompanyResponse(company);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    await this.prisma.company.delete({
      where: { id },
    });

    // Log activity
    await this.activityService.create({
      type: ActivityType.COMPANY_DELETED,
      userId,
      payload: {
        companyName: company.name,
      },
    });

    // Log action
    try {
      await this.loggingService.create({
        level: 'info',
        action: 'delete',
        entity: 'company',
        entityId: id,
        userId,
        message: `Company "${company.name}" deleted`,
        metadata: {
          companyName: company.name,
        },
      });
    } catch (logError) {
      console.error('CompaniesService.remove - failed to create log:', logError);
    }

    // Emit WebSocket event
    this.websocketGateway.emitCompanyDeleted(id);

    return { message: 'Company deleted successfully' };
  }

  async getStats(id: string) {
    const deals = await this.prisma.deal.findMany({
      where: { companyId: id },
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

  /**
   * Format company response with stats
   */
  private async formatCompanyResponse(company: any): Promise<CompanyResponseDto> {
    const stats = await this.getStats(company.id);

    return {
      id: company.id,
      name: company.name,
      website: company.website || undefined,
      industry: company.industry || undefined,
      email: company.email || undefined,
      phone: company.phone || undefined,
      social: (company.social as {
        instagram?: string;
        telegram?: string;
        whatsapp?: string;
        vk?: string;
        linkedin?: string;
      }) || undefined,
      address: company.address || undefined,
      notes: company.notes || undefined,
      employees: company.employees || undefined,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      stats,
    };
  }

}

