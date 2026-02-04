// Script to create admin user in DEV database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://crm_user:crm_password123@localhost:5432/crm_dev'
    }
  }
});

async function main() {
  try {
    // Create or update admin user
    const user = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: '$2b$10$inytgDSxkZw62e115Tz3GuSN6f.TNyZJFDDqSCEvxDQgN5/im1fC.',
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        id: 'admin-001',
        email: 'admin@example.com',
        password: '$2b$10$inytgDSxkZw62e115Tz3GuSN6f.TNyZJFDDqSCEvxDQgN5/im1fC.',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin user created/updated:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
