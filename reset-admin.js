// Script to reset admin user
// Run on server: node reset-admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  console.log('=== Reset Admin User ===\n');

  try {
    // First, list all existing users
    console.log('Step 1: Checking existing users...');
    const existingUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true }
    });

    console.log(`Found ${existingUsers.length} users in database:`);
    existingUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) - ${u.role}`);
    });
    console.log();

    // Delete existing admin if exists
    console.log('Step 2: Deleting old admin@example.com (if exists)...');
    const deleted = await prisma.user.deleteMany({
      where: { email: 'admin@example.com' }
    });
    console.log(`  Deleted ${deleted.count} user(s)`);
    console.log();

    // Create new admin with password admin123!
    console.log('Step 3: Creating new admin user...');
    const hashedPassword = await bcrypt.hash('admin123!', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      }
    });

    console.log('  ✅ Admin created successfully!');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log();

    console.log('=== SUCCESS ===');
    console.log('Login credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123!');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
