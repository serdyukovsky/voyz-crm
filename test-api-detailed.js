#!/usr/bin/env node

const API_URL = 'http://91.210.106.218:3001/api';

async function testAPI() {
  console.log('=== CRM API Diagnostic Test ===\n');

  let token;

  // Test 1: Login
  console.log('Test 1: Login...');
  try {
    // Try different credentials
    const credentials = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'admin@voyz.ru', password: 'admin123' },
    ];

    for (const cred of credentials) {
      console.log(`  Trying ${cred.email}...`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });

      if (response.ok) {
        const data = await response.json();
        token = data.access_token;
        console.log(`  ✅ Login successful with ${cred.email}`);
        console.log(`  Token: ${token.substring(0, 20)}...\n`);
        break;
      } else {
        const error = await response.text();
        console.log(`  ❌ Failed: ${response.status}`);
      }
    }

    if (!token) {
      console.log('\n❌ Could not login with any credentials. Stopping.\n');
      console.log('Please check:');
      console.log('1. Admin user exists: ssh root@91.210.106.218 "cd /root/crm-backend-dev && npm run create:admin"');
      console.log('2. Backend logs: ssh root@91.210.106.218 "pm2 logs crm-backend-dev --lines 50"\n');
      return;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
    return;
  }

  // Test 2: Get current user
  console.log('Test 2: Get current user (/auth/me)...');
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const user = await response.json();
      console.log(`  ✅ Current user: ${user.name} (${user.email})`);
      console.log(`  ID: ${user.id}\n`);
    } else {
      console.log(`  ❌ Failed: ${response.status} ${await response.text()}\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 3: Get users list
  console.log('Test 3: Get users list (/users)...');
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const users = await response.json();
      console.log(`  ✅ Found ${users.length} users:`);
      users.forEach(u => console.log(`    - ${u.name} (${u.email})`));
      console.log();
    } else {
      console.log(`  ❌ Failed: ${response.status} ${await response.text()}\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 4: Get tasks
  console.log('Test 4: Get tasks (/tasks)...');
  try {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const tasks = await response.json();
      console.log(`  ✅ Found ${tasks.length} tasks`);
      if (tasks.length > 0) {
        console.log(`  Sample task: ${tasks[0].title}`);
      }
      console.log();
    } else {
      const errorText = await response.text();
      console.log(`  ❌ Failed: ${response.status}`);
      console.log(`  Error: ${errorText}\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 5: Get deals
  console.log('Test 5: Get deals (/deals)...');
  try {
    const response = await fetch(`${API_URL}/deals?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const dealsData = await response.json();
      const deals = dealsData.data || [];
      console.log(`  ✅ Found ${deals.length} deals`);

      const dealsWithLinks = deals.filter(d => d.link);
      console.log(`  Deals with link field: ${dealsWithLinks.length}`);

      if (dealsWithLinks.length > 0) {
        console.log(`  ✅ Link field EXISTS in response`);
        console.log(`  Sample: "${dealsWithLinks[0].title}" → ${dealsWithLinks[0].link}`);
      } else if (deals.length > 0) {
        console.log(`  ⚠️  Link field exists but no deals have links set`);
        console.log(`  First deal fields: ${Object.keys(deals[0]).join(', ')}`);
        console.log(`  Has 'link' field: ${deals[0].hasOwnProperty('link') ? 'YES' : 'NO'}`);
      }
      console.log();
    } else {
      console.log(`  ❌ Failed: ${response.status} ${await response.text()}\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 6: Search deals by link
  console.log('Test 6: Search deals by link (/deals?search=...)...');
  try {
    const searchTerms = ['http', 'www', 'telegram', 'test'];

    for (const term of searchTerms) {
      const response = await fetch(`${API_URL}/deals?search=${encodeURIComponent(term)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const dealsData = await response.json();
        const deals = dealsData.data || [];
        if (deals.length > 0) {
          console.log(`  ✅ Search "${term}" found ${deals.length} results`);
          const withLinks = deals.filter(d => d.link && d.link.includes(term));
          if (withLinks.length > 0) {
            console.log(`    ${withLinks.length} matched in link field`);
          }
          break;
        }
      }
    }
    console.log();
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 7: Check Prisma schema via DB query
  console.log('Test 7: Database structure check...');
  console.log('  ⚠️  Need to check on server:');
  console.log('  ssh root@91.210.106.218');
  console.log('  cd /root/crm-backend-dev');
  console.log('  npx prisma migrate status');
  console.log('  Look for: 20260202172654_add_deal_link_field\n');

  console.log('=== Summary ===');
  console.log('If Tasks page or Search by link not working:');
  console.log('1. Check browser console (F12) for errors');
  console.log('2. Check migration status on server (see Test 7)');
  console.log('3. Check PM2 logs: ssh root@91.210.106.218 "pm2 logs crm-backend-dev --lines 100"');
  console.log('4. Restart backend: ssh root@91.210.106.218 "pm2 restart crm-backend-dev"');
}

testAPI().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
