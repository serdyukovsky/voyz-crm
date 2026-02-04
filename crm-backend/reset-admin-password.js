const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  await prisma.user.update({
    where: { email: 'admin@local.dev' },
    data: { password: hashedPassword }
  });
  
  console.log('Password reset successfully!');
  console.log('Email: admin@local.dev');
  console.log('Password: admin123');
  
  await prisma.$disconnect();
}

resetPassword().catch(console.error);
