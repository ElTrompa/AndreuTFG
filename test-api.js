// Test script to diagnose Strava API issues
const http = require('http');

function makeRequest(path, jwt = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };
    
    if (jwt) {
      options.headers = {
        'Authorization': `Bearer ${jwt}`
      };
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('🔍 Testing Strava API endpoints...\n');

  // Test 1: List all athletes
  console.log('1️⃣  GET /strava/admin/athletes');
  try {
    const res = await makeRequest('/strava/admin/athletes');
    console.log(`   Status: ${res.status}`);
    console.log(`   Athletes:`, res.data.athletes?.map(a => ({ id: a.athlete_id, has_token: a.has_access_token })));
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n2️⃣  GET /strava/athlete/debug?athlete_id=76265575');
  try {
    const res = await makeRequest('/strava/athlete/debug?athlete_id=76265575');
    console.log(`   Status: ${res.status}`);
    console.log(`   Result:`, res.data.ok ? '✅ SUCCESS' : '❌ FAILED');
    if (res.data.ok) {
      console.log(`   Athlete name: ${res.data.athlete?.firstname} ${res.data.athlete?.lastname}`);
      console.log(`   Athlete ID: ${res.data.athlete?.id}`);
      console.log(`   City: ${res.data.athlete?.city}`);
    } else {
      console.log(`   Error: ${res.data.error}`);
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n3️⃣  GET /strava/athlete (with JWT from token.txt)');
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdGhsZXRlX2lkIjo3NjI2NTU3NSwiaWF0IjoxNzcxOTE4NDg0LCJleHAiOjE3NzQ1MTA0ODR9._632nYjbxWjyKuGBcLrtGcS3ZBj0ZuW75EpcYzJqpbA';
  try {
    const res = await makeRequest('/strava/athlete', jwtToken);
    console.log(`   Status: ${res.status}`);
    console.log(`   Result:`, res.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
    if (res.status === 200) {
      console.log(`   Athlete name: ${res.data?.firstname} ${res.data?.lastname}`);
      console.log(`   Athlete ID: ${res.data?.id}`);
    } else {
      console.log(`   Error: ${res.data?.error}`);
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n4️⃣  GET /strava/activities (with JWT)');
  try {
    const res = await makeRequest('/strava/activities', jwtToken);
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Activities count: ${Array.isArray(res.data) ? res.data.length : 'N/A'}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        console.log(`   First activity: ${res.data[0]?.name}`);
      }
    } else {
      console.log(`   Error: ${res.data?.error}`);
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n✅ Test complete!');
}

test().catch(console.error);
