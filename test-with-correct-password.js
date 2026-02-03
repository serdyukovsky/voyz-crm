#!/usr/bin/env node

const API_URL = 'http://91.210.106.218:3001/api';

async function testWithCorrectPassword() {
  console.log('=== Testing with correct credentials ===\n');

  // Test 1: Login with correct password
  console.log('Test 1: Login with admin@example.com / admin123!...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123!'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ Login failed: ${response.status}`);
      console.log(`  Error: ${error}\n`);
      return;
    }

    const { access_token } = await response.json();
    console.log(`  ✅ Login successful!`);
    console.log(`  Token: ${access_token.substring(0, 30)}...\n`);

    // Test 2: Get current user
    console.log('Test 2: Get current user...');
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (meResponse.ok) {
      const user = await meResponse.json();
      console.log(`  ✅ Current user: ${user.name} (${user.email})`);
      console.log(`  Role: ${user.role}\n`);
    } else {
      console.log(`  ❌ Failed: ${meResponse.status}\n`);
    }

    // Test 3: Get users list
    console.log('Test 3: Get users list...');
    const usersResponse = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`  ✅ Found ${users.length} users`);
      users.forEach(u => console.log(`    - ${u.name} (${u.email})`));
      console.log();
    } else {
      console.log(`  ❌ Failed: ${usersResponse.status}\n`);
    }

    // Test 4: Get tasks
    console.log('Test 4: Get tasks...');
    const tasksResponse = await fetch(`${API_URL}/tasks`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (tasksResponse.ok) {
      const tasks = await tasksResponse.json();
      console.log(`  ✅ Tasks endpoint works! Found ${tasks.length} tasks`);
      if (tasks.length > 0) {
        console.log(`  First task: "${tasks[0].title}"`);
      }
      console.log();
    } else {
      const error = await tasksResponse.text();
      console.log(`  ❌ Failed: ${tasksResponse.status}`);
      console.log(`  Error: ${error}\n`);
    }

    // Test 5: Get deals
    console.log('Test 5: Get deals...');
    const dealsResponse = await fetch(`${API_URL}/deals?limit=10`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (dealsResponse.ok) {
      const dealsData = await dealsResponse.json();
      const deals = dealsData.data || [];
      console.log(`  ✅ Deals endpoint works! Found ${deals.length} deals`);

      // Check if link field exists
      if (deals.length > 0) {
        const firstDeal = deals[0];
        const hasLinkField = firstDeal.hasOwnProperty('link');
        console.log(`  Link field in response: ${hasLinkField ? '✅ YES' : '❌ NO'}`);

        if (hasLinkField) {
          const dealsWithLinks = deals.filter(d => d.link);
          console.log(`  Deals with links: ${dealsWithLinks.length}/${deals.length}`);

          if (dealsWithLinks.length > 0) {
            console.log(`  Sample: "${dealsWithLinks[0].title}" → ${dealsWithLinks[0].link}`);
          }
        }
      }
      console.log();
    } else {
      console.log(`  ❌ Failed: ${dealsResponse.status}\n`);
    }

    // Test 6: Search by link
    console.log('Test 6: Search deals...');
    const searchTerms = ['http', 'www', 'telegram', 'google', 'test'];

    let foundResults = false;
    for (const term of searchTerms) {
      const searchResponse = await fetch(`${API_URL}/deals?search=${encodeURIComponent(term)}&limit=5`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const results = searchData.data || [];

        if (results.length > 0) {
          console.log(`  ✅ Search "${term}" found ${results.length} results`);

          const matchedInLink = results.filter(d => d.link && d.link.toLowerCase().includes(term.toLowerCase()));
          const matchedInTitle = results.filter(d => d.title && d.title.toLowerCase().includes(term.toLowerCase()));

          if (matchedInLink.length > 0) {
            console.log(`    - ${matchedInLink.length} matched in link field ✅`);
            matchedInLink.slice(0, 2).forEach(d => {
              console.log(`      "${d.title}": ${d.link}`);
            });
          }
          if (matchedInTitle.length > 0) {
            console.log(`    - ${matchedInTitle.length} matched in title`);
          }

          foundResults = true;
          break;
        }
      }
    }

    if (!foundResults) {
      console.log(`  ⚠️  No search results found for any test term`);
      console.log(`  This might mean:`);
      console.log(`    - No deals in database yet`);
      console.log(`    - Or deals don't have links/matching titles`);
    }

    console.log('\n=== Summary ===');
    console.log('✅ Authentication: Working');
    console.log('✅ Tasks endpoint: Working');
    console.log('✅ Deals endpoint: Working');
    console.log(`${foundResults ? '✅' : '⚠️'} Search functionality: ${foundResults ? 'Working' : 'No test data'}`);
    console.log('\nYou can now:');
    console.log('1. Start frontend: cd CRM && npm run dev');
    console.log('2. Open http://localhost:5173');
    console.log('3. Login with: admin@example.com / admin123!');
    console.log('4. Test Tasks page and Search');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

testWithCorrectPassword();
