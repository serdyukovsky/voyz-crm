#!/bin/bash

echo "=== CRM Server Diagnostic & Fix ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Connecting to server 91.210.106.218...${NC}"
echo "Password: 5nlT3rry_4"
echo ""

# Create a heredoc script to run on server
cat > /tmp/server-fix-script.sh << 'SERVERSCRIPT'
#!/bin/bash

echo "=== Step 1: Check PM2 Status ==="
pm2 status

echo ""
echo "=== Step 2: Check Migration Status ==="
cd /root/crm-backend-dev
npx prisma migrate status | tail -20

echo ""
echo "=== Step 3: Apply Migrations ==="
npx prisma migrate deploy

echo ""
echo "=== Step 4: Check Admin User ==="
npx prisma studio --browser none &
STUDIO_PID=$!
sleep 2
kill $STUDIO_PID 2>/dev/null

# Check if admin exists using Prisma
echo "Checking for admin user in database..."
cat > /tmp/check-admin.js << 'CHECKJS'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, name: true, role: true }
  });

  console.log(`Found ${admins.length} admin user(s):`);
  admins.forEach(a => console.log(`  - ${a.name} (${a.email})`));

  if (admins.length === 0) {
    console.log('\nNo admin users found. Creating default admin...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN'
      }
    });

    console.log(`✅ Created admin: ${admin.email} / admin123`);
  }

  await prisma.$disconnect();
}

checkAdmin().catch(console.error);
CHECKJS

node /tmp/check-admin.js

echo ""
echo "=== Step 5: Restart Backend ==="
pm2 restart crm-backend-dev

echo ""
echo "=== Step 6: Check Logs ==="
pm2 logs crm-backend-dev --lines 30 --nostream

echo ""
echo "=== Step 7: Test Health Endpoint ==="
sleep 2
curl -s http://localhost:3001/api/health

echo ""
echo ""
echo "=== Done! ==="
echo "Try logging in with:"
echo "  Email: admin@example.com"
echo "  Password: admin123"

SERVERSCRIPT

chmod +x /tmp/server-fix-script.sh

echo "Script created. Now connecting to server..."
echo ""
echo "OPTION 1: Copy/paste these commands manually in terminal:"
echo ""
echo -e "${GREEN}ssh root@91.210.106.218${NC}"
echo -e "${GREEN}cd /root/crm-backend-dev${NC}"
echo -e "${GREEN}npx prisma migrate deploy${NC}"
echo -e "${GREEN}npm run create:admin${NC}"
echo -e "${GREEN}pm2 restart crm-backend-dev${NC}"
echo -e "${GREEN}exit${NC}"
echo ""
echo "OPTION 2: Or try automated connection:"
echo ""

# Try with expect if available
if command -v expect &> /dev/null; then
    expect << 'EXPECTSCRIPT'
    set timeout 120
    spawn ssh -o StrictHostKeyChecking=no root@91.210.106.218
    expect {
        "*password:" {
            send "5nlT3rry_4\r"
            exp_continue
        }
        "*# " {
            send "cd /root/crm-backend-dev\r"
            expect "*# "

            send "echo '=== Checking migration status ==='\r"
            expect "*# "

            send "npx prisma migrate status | tail -10\r"
            expect "*# "

            send "echo ''\r"
            send "echo '=== Applying migrations ==='\r"
            expect "*# "

            send "npx prisma migrate deploy\r"
            expect {
                "*Applied*" { exp_continue }
                "*No pending*" { exp_continue }
                "*# " { }
                timeout { }
            }

            send "echo ''\r"
            send "echo '=== Creating admin user ==='\r"
            expect "*# "

            send "npm run create:admin\r"
            expect {
                "*already exists*" {
                    send "echo 'Admin already exists'\r"
                    expect "*# "
                }
                "*Created*" {
                    expect "*# "
                }
                timeout { }
            }

            send "echo ''\r"
            send "echo '=== Restarting backend ==='\r"
            expect "*# "

            send "pm2 restart crm-backend-dev\r"
            expect "*# "

            send "sleep 3\r"
            expect "*# "

            send "echo ''\r"
            send "echo '=== Testing health ==='\r"
            expect "*# "

            send "curl -s http://localhost:3001/api/health\r"
            expect "*# "

            send "echo ''\r"
            send "echo 'Done! Admin credentials: admin@example.com / admin123'\r"
            expect "*# "

            send "exit\r"
        }
        timeout {
            puts "\nConnection timeout"
            exit 1
        }
    }
EXPECTSCRIPT
else
    echo -e "${YELLOW}expect not installed. Please use OPTION 1 (manual).${NC}"
fi

echo ""
echo "After running commands on server, test locally:"
echo "  cd \"$PWD/CRM\""
echo "  npm run dev"
echo ""
