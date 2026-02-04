#!/bin/bash

echo "=== Uploading and running admin reset script on server ==="
echo ""

# Create the script content
cat > /tmp/reset-admin.js << 'ENDSCRIPT'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdmin() {
  console.log('=== Resetting Admin User ===\n');

  try {
    // List existing users
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    console.log();

    // Delete old admin
    await prisma.user.deleteMany({ where: { email: 'admin@example.com' } });
    console.log('Old admin deleted');

    // Create new admin
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

    console.log('\n✅ Admin created!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123!\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
ENDSCRIPT

echo "Script created locally at /tmp/reset-admin.js"
echo ""
echo "Now you need to run these commands in a NEW terminal window:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# 1. Connect to server"
echo "ssh root@91.210.106.218"
echo ""
echo "# 2. Go to backend directory"
echo "cd /root/crm-backend-dev"
echo ""
echo "# 3. Create the reset script on server"
echo "cat > reset-admin.js << 'ENDSCRIPT'"
echo "const { PrismaClient } = require('@prisma/client');"
echo "const bcrypt = require('bcryptjs');"
echo "const prisma = new PrismaClient();"
echo ""
echo "async function resetAdmin() {"
echo "  console.log('=== Resetting Admin ===');"
echo "  try {"
echo "    await prisma.user.deleteMany({ where: { email: 'admin@example.com' } });"
echo "    const hashedPassword = await bcrypt.hash('admin123!', 10);"
echo "    const admin = await prisma.user.create({"
echo "      data: {"
echo "        email: 'admin@example.com',"
echo "        password: hashedPassword,"
echo "        name: 'Admin',"
echo "        firstName: 'Admin',"
echo "        lastName: 'User',"
echo "        role: 'ADMIN'"
echo "      }"
echo "    });"
echo "    console.log('✅ Admin created: admin@example.com / admin123!');"
echo "  } catch (error) {"
echo "    console.error('Error:', error.message);"
echo "  } finally {"
echo "    await prisma.\$disconnect();"
echo "  }"
echo "}"
echo "resetAdmin();"
echo "ENDSCRIPT"
echo ""
echo "# 4. Run the script"
echo "node reset-admin.js"
echo ""
echo "# 5. Apply migrations"
echo "npx prisma migrate deploy"
echo ""
echo "# 6. Restart backend"
echo "pm2 restart crm-backend-dev"
echo ""
echo "# 7. Exit"
echo "exit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "OR use this ONE-LINE command after connecting to server:"
echo ""
echo 'cd /root/crm-backend-dev && node -e "const{PrismaClient}=require('\''@prisma/client'\'');const bcrypt=require('\''bcryptjs'\'');const prisma=new PrismaClient();(async()=>{try{await prisma.user.deleteMany({where:{email:'\''admin@example.com'\''}});const hashedPassword=await bcrypt.hash('\''admin123!'\'',10);await prisma.user.create({data:{email:'\''admin@example.com'\'',password:hashedPassword,name:'\''Admin'\'',firstName:'\''Admin'\'',lastName:'\''User'\'',role:'\''ADMIN'\''}});console.log('\''✅ Admin created: admin@example.com / admin123!'\'');}catch(e){console.error(e.message);}finally{await prisma.$disconnect();}})();" && npx prisma migrate deploy && pm2 restart crm-backend-dev'
echo ""
