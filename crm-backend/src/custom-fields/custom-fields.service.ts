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

  /**
   * Update options for a multi-select custom field by adding new values from CSV
   */
  async addOptionsToMultiSelectField(
    customFieldId: string,
    newValues: string[],
  ): Promise<void> {
    const field = await this.prisma.customField.findUnique({
      where: { id: customFieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID ${customFieldId} not found`);
    }

    // Only update if field is MULTI_SELECT or SELECT
    if (field.type !== 'MULTI_SELECT' && field.type !== 'SELECT') {
      return;
    }

    // Parse current options
    let currentOptions: string[] = [];
    if (field.options) {
      if (Array.isArray(field.options)) {
        currentOptions = field.options.filter((v): v is string => typeof v === 'string');
      } else if (typeof field.options === 'string') {
        try {
          const parsed = JSON.parse(field.options);
          if (Array.isArray(parsed)) {
            currentOptions = parsed.filter((v): v is string => typeof v === 'string');
          }
        } catch (e) {
          console.error(`Failed to parse options for field ${customFieldId}:`, e);
        }
      } else if (typeof field.options === 'object' && 'options' in field.options) {
        const optionsValue = (field.options as any).options;
        currentOptions = Array.isArray(optionsValue) 
          ? optionsValue.filter((v): v is string => typeof v === 'string')
          : [];
      }
    }

    // Normalize new values
    const normalizedNewValues = newValues
      .map((v) => v?.trim())
      .filter((v) => v && v.length > 0);

    if (normalizedNewValues.length === 0) {
      return;
    }

    // Find new values that don't exist (case-insensitive)
    const currentOptionsSet = new Set(currentOptions.map((o) => o.toLowerCase()));
    const valuesToAdd = normalizedNewValues.filter(
      (v) => !currentOptionsSet.has(v.toLowerCase()),
    );

    if (valuesToAdd.length === 0) {
      return; // All values already exist
    }

    // Add new values (preserve case from CSV)
    const updatedOptions = [...currentOptions, ...valuesToAdd];

    // Update field options
    await this.prisma.customField.update({
      where: { id: customFieldId },
      data: {
        options: { options: updatedOptions },
      },
    });

    console.log(
      `[CUSTOM FIELD OPTIONS] Added ${valuesToAdd.length} new options to field ${field.name} (${customFieldId}):`,
      valuesToAdd,
    );
  }
}






