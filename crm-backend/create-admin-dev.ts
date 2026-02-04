import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://crm_user:crm_password123@91.210.106.218:5432/crm_dev'
    }
  }
});

async function main() {
  try {
    console.log('🌱 Creating admin user in DEV database...');
    
    const email = 'admin@example.com';
    const password = 'admin123';

    // Check if exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      }
    });

    console.log('✅ Admin created:', user.email, user.id);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
