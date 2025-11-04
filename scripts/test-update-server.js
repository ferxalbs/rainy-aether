#!/usr/bin/env node

// Test script for the update server
import http from 'http';

const SERVER_URL = process.env.UPDATE_SERVER_URL || 'http://localhost:8080';

// Test cases
const tests = [
  {
    name: 'Health check',
    url: '/health',
    expected: (res) => res.status === 'ok'
  },
  {
    name: 'Info endpoint',
    url: '/info',
    expected: (res) => res.name && res.version
  },
  {
    name: 'Update check (no update available)',
    url: '/windows/x86_64/9.9.9', // Higher version than current
    expected: (res) => res.available === false
  },
  {
    name: 'Update check (update available)',
    url: '/windows/x86_64/0.0.1', // Lower version than current
    expected: (res) => res.version && res.download_url && !res.available // available field not present when update exists
  }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = SERVER_URL + url;
    console.log(`Testing: ${fullUrl}`);

    http.get(fullUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('🧪 Testing update server...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Running: ${test.name}`);
      const response = await makeRequest(test.url);

      if (test.expected(response)) {
        console.log('✅ PASSED\n');
        passed++;
      } else {
        console.log('❌ FAILED - Unexpected response:');
        console.log(JSON.stringify(response, null, 2));
        console.log('');
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      console.log('');
      failed++;
    }
  }

  console.log(`📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Check if server is running first
makeRequest('/health')
  .then(() => {
    runTests();
  })
  .catch((error) => {
    console.error('❌ Update server is not running!');
    console.error('Start it with: pnpm update-server');
    console.error('Error:', error.message);
    process.exit(1);
  });
