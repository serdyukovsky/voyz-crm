import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';

/**
 * Service for managing system field options (rejectionReasons, directions, contactMethods, etc.)
 * 
 * This service ensures that when importing data, new values from CSV are added to the
 * available options list so they can be used in future records.
 */
@Injectable()
export class SystemFieldOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available options for a system field
   */
  async getOptions(entityType: 'deal' | 'contact', fieldName: string): Promise<string[]> {
    const fieldOptions = await this.prisma.systemFieldOptions.findUnique({
      where: {
        entityType_fieldName: {
          entityType,
          fieldName,
        },
      },
    });

    return fieldOptions?.options || [];
  }

  /**
   * Add new options to a system field if they don't exist
   * Returns the updated list of all options (existing + new)
   */
  async addOptionsIfMissing(
    entityType: 'deal' | 'contact',
    fieldName: string,
    newValues: string[],
  ): Promise<string[]> {
    if (!newValues || newValues.length === 0) {
      return await this.getOptions(entityType, fieldName);
    }

    // Filter out empty values and normalize
    const normalizedValues = newValues
      .map((v) => v?.trim())
      .filter((v) => v && v.length > 0);

    if (normalizedValues.length === 0) {
      return await this.getOptions(entityType, fieldName);
    }

    // Get current options
    const currentOptions = await this.getOptions(entityType, fieldName);
    const currentOptionsSet = new Set(currentOptions.map((o) => o.toLowerCase()));

    // Find new values that don't exist
    const valuesToAdd = normalizedValues.filter(
      (v) => !currentOptionsSet.has(v.toLowerCase()),
    );

    if (valuesToAdd.length === 0) {
      // All values already exist
      return currentOptions;
    }

    // Add new values to the list (preserve case from CSV)
    const updatedOptions = [...currentOptions, ...valuesToAdd];

    // Upsert the field options
    await this.prisma.systemFieldOptions.upsert({
      where: {
        entityType_fieldName: {
          entityType,
          fieldName,
        },
      },
      create: {
        entityType,
        fieldName,
        options: updatedOptions,
      },
      update: {
        options: updatedOptions,
      },
    });

    console.log(
      `[SYSTEM FIELD OPTIONS] Added ${valuesToAdd.length} new options to ${entityType}.${fieldName}:`,
      valuesToAdd,
    );

    return updatedOptions;
  }

  /**
   * Remove an option from a system field
   * Returns the updated list of options
   */
  async removeOption(
    entityType: 'deal' | 'contact',
    fieldName: string,
    option: string,
  ): Promise<string[]> {
    const currentOptions = await this.getOptions(entityType, fieldName);
    const updatedOptions = currentOptions.filter(
      (o) => o.toLowerCase() !== option.toLowerCase(),
    );

    if (updatedOptions.length === currentOptions.length) {
      return currentOptions;
    }

    await this.prisma.systemFieldOptions.update({
      where: {
        entityType_fieldName: {
          entityType,
          fieldName,
        },
      },
      data: {
        options: updatedOptions,
      },
    });

    return updatedOptions;
  }

  /**
   * Initialize default options for system fields
   * Called on first import or system setup
   */
  async initializeDefaultOptions(): Promise<void> {
    // Default rejection reasons (from translations)
    await this.addOptionsIfMissing('deal', 'rejectionReasons', [
      'Price',
      'Competitor',
      'Timing',
      'Budget',
      'Requirements',
      'Other',
    ]);

    // Default contact methods
    await this.addOptionsIfMissing('contact', 'contactMethods', [
      'Whatsapp',
      'Telegram',
      'Direct',
    ]);

    // Directions - no defaults, will be populated from imports
  }
}


