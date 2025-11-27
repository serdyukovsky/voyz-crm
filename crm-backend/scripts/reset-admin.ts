import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function resetAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123'; // Simple password for testing
  
  try {
    console.log('🔄 Resetting admin user...');
    
    // Delete existing admin if exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  Found existing user with email ${email}, deleting...`);
      await prisma.user.delete({
        where: { email },
      });
      console.log('✅ Existing user deleted');
    }

    // Hash password with argon2
    console.log('🔐 Hashing password...');
    const hashedPassword = await argon2.hash(password);

    // Create new admin user
    console.log('👤 Creating admin user...');
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', password);
    console.log('👑 Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 You can now login with these credentials.');
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database!');
      console.error('Please make sure PostgreSQL is running.');
    } else {
      console.error('❌ Error resetting admin user:', error.message || error);
      console.error('Error details:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();

