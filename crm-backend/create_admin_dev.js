const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://crm_user:crm_password123@localhost:5432/crm_dev';

console.log('📡 Connecting to database:', databaseUrl.replace(/:[^@]*@/, ':***@'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  try {
    console.log('🌱 Creating admin in DEV database...');
    
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

    console.log('✅ Admin ready!');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
