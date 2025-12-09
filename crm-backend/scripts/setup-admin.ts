import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function setupAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123';
  const firstName = 'Admin';
  const lastName = 'User';
  
  try {
    console.log('🔄 Setting up admin user...');
    console.log(`📧 Email: ${email}`);
    
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists.`);
      console.log('🔄 Updating password...');
      
      // Hash new password
      const hashedPassword = await argon2.hash(password);
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: UserRole.ADMIN,
          isActive: true,
          firstName,
          lastName,
        },
      });

      console.log('\n✅ Admin user updated successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', updatedUser.email);
      console.log('🔑 Password:', password);
      console.log('👑 Role:', updatedUser.role);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 You can now login with these credentials.');
    } else {
      console.log('👤 Creating new admin user...');
      
      // Hash password
      const hashedPassword = await argon2.hash(password);

      // Create admin user
      const admin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
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
    }
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database!');
      console.error('Please make sure:');
      console.error('  1. PostgreSQL is running');
      console.error('  2. DATABASE_URL is set in .env file');
      console.error('  3. Database exists and migrations are applied');
    } else {
      console.error('❌ Error setting up admin user:', error.message || error);
      console.error('Error details:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();






