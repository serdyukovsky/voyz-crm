import { PrismaClient, CustomFieldType } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestCustomFields() {
  try {
    console.log('Creating test custom fields for deals...');

    // Create custom fields in different groups
    const fields = [
      {
        name: 'Industry',
        key: 'industry',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'basic',
        order: 1,
        options: ['Technology', 'Finance', 'Healthcare', 'Retail', 'Other'],
        isRequired: false,
      },
      {
        name: 'Company Size',
        key: 'company_size',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'basic',
        order: 2,
        options: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
        isRequired: false,
      },
      {
        name: 'Source',
        key: 'source',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'basic',
        order: 3,
        options: ['Website', 'Referral', 'Cold Call', 'Email', 'Social Media'],
        isRequired: false,
      },
      {
        name: 'Budget',
        key: 'budget',
        type: CustomFieldType.NUMBER,
        entityType: 'deal',
        group: 'financial',
        order: 1,
        isRequired: false,
      },
      {
        name: 'Annual Revenue',
        key: 'annual_revenue',
        type: CustomFieldType.NUMBER,
        entityType: 'deal',
        group: 'financial',
        order: 2,
        isRequired: false,
      },
      {
        name: 'Payment Terms',
        key: 'payment_terms',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'financial',
        order: 3,
        options: ['Net 15', 'Net 30', 'Net 60', 'Due on Receipt'],
        isRequired: false,
      },
      {
        name: 'Priority',
        key: 'priority',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'additional',
        order: 1,
        options: ['Low', 'Medium', 'High', 'Critical'],
        isRequired: false,
      },
      {
        name: 'Contract Type',
        key: 'contract_type',
        type: CustomFieldType.SELECT,
        entityType: 'deal',
        group: 'additional',
        order: 2,
        options: ['Monthly', 'Quarterly', 'Annual', 'One-time'],
        isRequired: false,
      },
      {
        name: 'Next Follow-up',
        key: 'next_followup',
        type: CustomFieldType.DATE,
        entityType: 'deal',
        group: 'additional',
        order: 3,
        isRequired: false,
      },
    ];

    for (const field of fields) {
      // Check if field already exists
      const existing = await prisma.customField.findFirst({
        where: {
          key: field.key,
          entityType: field.entityType,
        },
      });

      if (existing) {
        console.log(`Field ${field.key} already exists, skipping...`);
        continue;
      }

      const created = await prisma.customField.create({
        data: {
          ...field,
          options: field.options ? JSON.stringify(field.options) : null,
        },
      });

      console.log(`Created custom field: ${created.name} (${created.key})`);
    }

    console.log('Test custom fields created successfully!');
  } catch (error) {
    console.error('Error creating test custom fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustomFields()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

