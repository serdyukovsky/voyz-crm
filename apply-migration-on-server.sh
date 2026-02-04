#!/bin/bash
# Script to apply migration on remote server

SERVER="root@91.210.106.218"
PASSWORD="5nlT3rry_4"
DEV_PATH="/root/crm-backend-dev"

echo "=== Applying migration for link field on dev server ==="
echo ""

# Use expect to handle password
expect << 'EXPECT_SCRIPT'
set timeout 60
spawn ssh -o StrictHostKeyChecking=no root@91.210.106.218
expect {
    "*password:" {
        send "5nlT3rry_4\r"
        exp_continue
    }
    "*#" {
        send "cd /root/crm-backend-dev\r"
        expect "*#"

        send "echo '=== Current migration status ==='\r"
        expect "*#"

        send "npx prisma migrate status\r"
        expect "*#"

        send "echo ''\r"
        expect "*#"

        send "echo '=== Applying pending migrations ==='\r"
        expect "*#"

        send "npx prisma migrate deploy\r"
        expect {
            "*Applied*" {
                send "echo '\nMigrations applied successfully'\r"
                expect "*#"
            }
            "*No pending migrations*" {
                send "echo '\nNo pending migrations'\r"
                expect "*#"
            }
            timeout {
                send "echo '\nTimeout applying migrations'\r"
                expect "*#"
            }
        }

        send "echo ''\r"
        expect "*#"

        send "echo '=== Restarting PM2 process ==='\r"
        expect "*#"

        send "pm2 restart crm-backend-dev\r"
        expect "*#"

        send "echo '\nDone!'\r"
        expect "*#"

        send "exit\r"
    }
    timeout {
        puts "\nConnection timeout"
        exit 1
    }
}
EXPECT_SCRIPT

echo ""
echo "=== Migration completed ==="
echo "Backend should now have the 'link' field in Deal table"
echo "You can test by running: curl http://91.210.106.218:3001/api/health"
