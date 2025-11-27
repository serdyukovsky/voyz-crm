import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CustomField, CustomFieldType } from '@prisma/client';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    key: string;
    type: CustomFieldType;
    entityType: string;
    group?: string;
    isRequired?: boolean;
    options?: any;
  }) {
    return this.prisma.customField.create({
      data,
    });
  }

  async findByEntity(entityType: string) {
    return this.prisma.customField.findMany({
      where: {
        entityType,
        isActive: true,
      },
      orderBy: [{ group: 'asc' }, { order: 'asc' }],
    });
  }

  async setValue(
    customFieldId: string,
    entityId: string,
    entityType: string,
    value: any,
    dealId?: string,
    contactId?: string,
  ) {
    const field = await this.prisma.customField.findUnique({
      where: { id: customFieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID ${customFieldId} not found`);
    }

    // Check if value exists
    const existing = await this.prisma.customFieldValue.findFirst({
      where: {
        customFieldId,
        ...(dealId ? { dealId } : {}),
        ...(contactId ? { contactId } : {}),
        entityId,
      },
    });

    if (existing) {
      return this.prisma.customFieldValue.update({
        where: { id: existing.id },
        data: { value },
      });
    }

    return this.prisma.customFieldValue.create({
      data: {
        customFieldId,
        dealId,
        contactId,
        entityId,
        entityType,
        value,
      },
    });
  }
}





