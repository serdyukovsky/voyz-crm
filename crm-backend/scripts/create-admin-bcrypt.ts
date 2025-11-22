import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@local.dev';
  const password = 'admin123';
  const firstName = 'Admin';
  const lastName = 'User';

  try {
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');

    // Check if admin already exists
    console.log(`Checking if user with email ${email} exists...`);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      console.log('Is Active:', existingUser.isActive);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Test password
      console.log('\nTesting password...');
      try {
        const isValid = await bcrypt.compare(password, existingUser.password);
        if (isValid) {
          console.log('✅ Password is correct!');
        } else {
          console.log('❌ Password is incorrect!');
          console.log('The user exists but the password does not match.');
          console.log('To reset password, delete the user and create again.');
        }
      } catch (error) {
        console.log('⚠️  Could not verify password (might be using different hashing)');
      }
      
      return;
    }

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash(password, 10);

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

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', admin.email);
    console.log('Password:', password);
    console.log('Password Hash:', hashedPassword);
    console.log('Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now login with these credentials.');
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database!');
      console.error('Please make sure PostgreSQL is running.');
    } else {
      console.error('❌ Error:', error.message || error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

