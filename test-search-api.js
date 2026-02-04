#!/usr/bin/env node

// Test script to check if search by link works
const API_URL = 'http://91.210.106.218:3001/api';

async function testSearch() {
  console.log('=== Testing Search by Link ===\n');

  // First, get a token (you'll need to replace with actual credentials)
  console.log('1. Login to get token...');
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status, await loginResponse.text());
    return;
  }

  const { access_token } = await loginResponse.json();
  console.log('✓ Login successful\n');

  // Test 1: Get all deals to see if any have link field
  console.log('2. Fetching deals to check link field...');
  const dealsResponse = await fetch(`${API_URL}/deals?limit=10`, {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });

  if (!dealsResponse.ok) {
    console.error('Failed to fetch deals:', dealsResponse.status);
    return;
  }

  const deals = await dealsResponse.json();
  console.log(`✓ Fetched ${deals.data?.length || 0} deals`);

  const dealsWithLinks = deals.data?.filter(d => d.link) || [];
  console.log(`  - Deals with link field: ${dealsWithLinks.length}`);

  if (dealsWithLinks.length > 0) {
    console.log('  - Sample links:');
    dealsWithLinks.slice(0, 3).forEach(d => {
      console.log(`    - "${d.title}": ${d.link}`);
    });
  }
  console.log();

  // Test 2: Try searching by a link value (if we have one)
  if (dealsWithLinks.length > 0) {
    const sampleLink = dealsWithLinks[0].link;
    const searchTerm = sampleLink.includes('://')
      ? sampleLink.split('://')[1].split('/')[0]  // Extract domain
      : sampleLink.substring(0, 5);  // First 5 chars

    console.log(`3. Testing search with term: "${searchTerm}"`);
    const searchResponse = await fetch(`${API_URL}/deals?search=${encodeURIComponent(searchTerm)}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!searchResponse.ok) {
      console.error('Search failed:', searchResponse.status);
      return;
    }

    const searchResults = await searchResponse.json();
    console.log(`✓ Search returned ${searchResults.data?.length || 0} results`);

    const foundByLink = searchResults.data?.filter(d =>
      d.link && d.link.includes(searchTerm)
    ) || [];

    console.log(`  - Results matching in link field: ${foundByLink.length}`);
    if (foundByLink.length > 0) {
      console.log('  ✓ Search by link is WORKING!');
    } else {
      console.log('  ✗ Search by link is NOT working (no results found in link field)');
    }
  } else {
    console.log('3. Skipping search test - no deals with links found');
    console.log('   This might mean:');
    console.log('   - Migration not applied on server');
    console.log('   - No test data with links');
  }

  console.log('\n=== Test Complete ===');
}

testSearch().catch(err => {
  console.error('Error running test:', err.message);
  process.exit(1);
});
