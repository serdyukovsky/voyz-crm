import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function checkAndCreateAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || 'User';

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
        const isValid = await argon2.verify(existingUser.password, password);
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
    const hashedPassword = await argon2.hash(password);

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
    console.log('Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now login with these credentials.');
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database!');
      console.error('Please make sure:');
      console.error('  1. PostgreSQL is running on localhost:5432');
      console.error('  2. DATABASE_URL is set in .env file');
      console.error('  3. Database exists and migrations are applied');
      console.error('\nTo start PostgreSQL:');
      console.error('  sudo service postgresql start');
      console.error('\nTo apply migrations:');
      console.error('  npm run prisma:migrate');
    } else {
      console.error('❌ Error:', error.message || error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAdmin();




