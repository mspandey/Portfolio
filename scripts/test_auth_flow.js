import 'dotenv/config';
import app from '../server/app.js';
import http from 'http';

const adminUser = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
const adminPass = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

if (!adminUser || !adminPass) {
  console.error('❌ Error: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured.');
  process.exit(1);
}

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  console.log(`\n==================================================`);
  console.log(`🚀 RUNNING FULL END-TO-END AUTHENTICATION TEST`);
  console.log(`==================================================\n`);

  try {
    // 1. Test Missing Fields (400)
    console.log('1. Testing missing credentials...');
    const res1 = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Status:', res1.status, await res1.json());
    if (res1.status !== 400) throw new Error('Expected 400 for missing credentials');

    // 2. Test Invalid Credentials (401)
    console.log('\n2. Testing invalid password...');
    const res2 = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: 'definitely_wrong_password_12345!' })
    });
    console.log('Status:', res2.status, await res2.json());
    if (res2.status !== 401) throw new Error('Expected 401 for invalid password');

    // 3. Test Valid Login via /api/admin/login (200)
    console.log('\n3. Testing valid login via /api/admin/login...');
    const res3 = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPass })
    });
    const data3 = await res3.json();
    console.log('Status:', res3.status, data3.success);
    if (res3.status !== 200 || !data3.token) throw new Error('Expected 200 and token for valid login');

    const token = data3.token;
    const cookieHeader = res3.headers.get('set-cookie');
    console.log('Set-Cookie received:', Boolean(cookieHeader));

    // 4. Test Valid Login via /api/admin/auth/login (200)
    console.log('\n4. Testing valid login via /api/admin/auth/login...');
    const res4 = await fetch(`${base}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPass })
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status, data4.success);
    if (res4.status !== 200 || !data4.token) throw new Error('Expected 200 for /api/admin/auth/login');

    // 5. Test Unauthenticated Request to Protected Route (401)
    console.log('\n5. Testing unauthenticated access to /api/admin/messages...');
    const res5 = await fetch(`${base}/api/admin/messages`);
    console.log('Status:', res5.status, await res5.json());
    if (res5.status !== 401) throw new Error('Expected 401 for unauthenticated access');

    // 6. Test Authenticated Request with Bearer Token (200)
    console.log('\n6. Testing authenticated access with Bearer token...');
    const res6 = await fetch(`${base}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res6.status, 'Messages count:', (await res6.json()).length);
    if (res6.status !== 200) throw new Error('Expected 200 for authenticated access');

    // 7. Test Check Auth /api/admin/me
    console.log('\n7. Testing /api/admin/me...');
    const res7 = await fetch(`${base}/api/admin/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res7.status, await res7.json());
    if (res7.status !== 200) throw new Error('Expected 200 for /api/admin/me');

    // 8. Test Logout
    console.log('\n8. Testing /api/admin/logout...');
    const res8 = await fetch(`${base}/api/admin/logout`, { method: 'POST' });
    console.log('Status:', res8.status, await res8.json());
    if (res8.status !== 200) throw new Error('Expected 200 for logout');

    console.log('\n🎉 ALL AUTHENTICATION ENDPOINTS AND SCENARIOS PASSED 100%!');
  } catch (err) {
    console.error('Auth test failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
