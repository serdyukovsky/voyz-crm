import { PrismaClient, UserRole, TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🚀 Creating test data...\n');

    // 1. Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@local.dev' },
    });

    if (!admin) {
      console.error('❌ Admin user not found! Please create admin first.');
      process.exit(1);
    }

    console.log('✅ Admin user found:', admin.email);

    // 2. Create or get default pipeline
    let pipeline = await prisma.pipeline.findFirst({
      where: { isDefault: true },
    });

    if (!pipeline) {
      console.log('📊 Creating default pipeline...');
      pipeline = await prisma.pipeline.create({
        data: {
          name: 'Default Pipeline',
          description: 'Default sales pipeline',
          isDefault: true,
          isActive: true,
          order: 0,
        },
      });
      console.log('✅ Pipeline created:', pipeline.name);
    } else {
      console.log('✅ Pipeline exists:', pipeline.name);
    }

    // 3. Create stages if they don't exist
    const stageNames = [
      { name: 'New', order: 0, color: '#6B7280', isClosed: false },
      { name: 'Qualification', order: 1, color: '#3B82F6', isClosed: false },
      { name: 'Proposal', order: 2, color: '#8B5CF6', isClosed: false },
      { name: 'Negotiation', order: 3, color: '#F59E0B', isClosed: false },
      { name: 'Won', order: 4, color: '#10B981', isClosed: true },
      { name: 'Lost', order: 5, color: '#EF4444', isClosed: true },
    ];

    const stages = [];
    for (const stageData of stageNames) {
      let stage = await prisma.stage.findFirst({
        where: {
          pipelineId: pipeline.id,
          name: stageData.name,
        },
      });

      if (!stage) {
        stage = await prisma.stage.create({
          data: {
            ...stageData,
            pipelineId: pipeline.id,
            isDefault: stageData.name === 'New',
          },
        });
        console.log(`✅ Stage created: ${stage.name}`);
      } else {
        console.log(`✅ Stage exists: ${stage.name}`);
      }
      stages.push(stage);
    }

    // 4. Create test companies
    const companies = [];
    const companyNames = ['Acme Corp', 'Tech Solutions Inc', 'Global Industries', 'StartupXYZ', 'MegaCorp'];
    
    for (const name of companyNames) {
      let company = await prisma.company.findFirst({
        where: { name },
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            name,
            industry: ['Technology', 'Finance', 'Manufacturing', 'Services', 'Retail'][Math.floor(Math.random() * 5)],
            website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
            email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          },
        });
        console.log(`✅ Company created: ${company.name}`);
      } else {
        console.log(`✅ Company exists: ${company.name}`);
      }
      companies.push(company);
    }

    // 5. Create test contacts
    const contacts = [];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    for (let i = 0; i < 8; i++) {
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

      let contact = await prisma.contact.findFirst({
        where: { email },
      });

      if (!contact) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        contact = await prisma.contact.create({
          data: {
            fullName,
            email,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            companyId: company.id,
            companyName: company.name,
            position: ['CEO', 'CTO', 'CFO', 'Manager', 'Director'][Math.floor(Math.random() * 5)],
          },
        });
        console.log(`✅ Contact created: ${contact.fullName}`);
      } else {
        console.log(`✅ Contact exists: ${contact.fullName}`);
      }
      contacts.push(contact);
    }

    // 6. Create test deals
    const dealTitles = [
      'Enterprise Software License',
      'Cloud Migration Project',
      'Marketing Campaign 2025',
      'Website Redesign',
      'Mobile App Development',
      'Data Analytics Platform',
      'Customer Support System',
      'E-commerce Integration',
      'Security Audit',
      'Infrastructure Upgrade',
    ];

    const deals = [];
    for (let i = 0; i < dealTitles.length; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const stage = stages[Math.floor(Math.random() * (stages.length - 2))]; // Exclude Won/Lost
      const amount = Math.floor(Math.random() * 500000) + 10000;
      const dealNumber = `DEAL-${String(i + 1).padStart(6, '0')}`;

      const deal = await prisma.deal.create({
        data: {
          number: dealNumber,
          title: dealTitles[i],
          amount,
          contactId: contact.id,
          companyId: contact.companyId,
          pipelineId: pipeline.id,
          stageId: stage.id,
          assignedToId: admin.id,
          createdById: admin.id,
          expectedCloseAt: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
        },
      });
      deals.push(deal);
      console.log(`✅ Deal created: ${deal.title} ($${amount.toLocaleString()})`);
    }

    // 7. Create some tasks
    for (let i = 0; i < 5; i++) {
      const deal = deals[Math.floor(Math.random() * deals.length)];
      await prisma.task.create({
        data: {
          title: `Follow up with ${deal.title}`,
          description: 'Schedule a call to discuss the proposal',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          type: TaskType.CALL,
          dealId: deal.id,
          assignedToId: admin.id,
          createdById: admin.id,
          deadline: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`✅ Task created for deal: ${deal.title}`);
    }

    console.log('\n🎉 Test data created successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Pipeline: 1`);
    console.log(`   - Stages: ${stages.length}`);
    console.log(`   - Companies: ${companies.length}`);
    console.log(`   - Contacts: ${contacts.length}`);
    console.log(`   - Deals: ${deals.length}`);
    console.log(`   - Tasks: 5`);

  } catch (error: any) {
    console.error('❌ Error creating test data:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();

