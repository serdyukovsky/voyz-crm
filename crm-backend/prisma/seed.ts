import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get admin credentials from env or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    console.log(`   Email: ${adminEmail}`);
    return;
  }

  // Validate password strength
  if (adminPassword.length < 8) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 8 characters long');
    process.exit(1);
  }

  // Create admin user with argon2
  const hashedPassword = await argon2.hash(adminPassword);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
  console.log('🔑 Admin credentials:');
  console.log(`   Email: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('   Password: Admin123!@# (default - please change!)');
    console.log('⚠️  Set ADMIN_PASSWORD in .env to use custom password');
  } else {
    console.log('   Password: [from ADMIN_PASSWORD env variable]');
  }
  console.log('⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
