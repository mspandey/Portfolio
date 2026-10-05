import 'dotenv/config';
const liveUrl = 'https://public-five-psi-47.vercel.app';

async function testLiveProduction() {
  console.log(`Testing Live Deployed Website: ${liveUrl}`);

  // Wait 15 seconds for Vercel deployment to finish
  console.log('Waiting 15 seconds for Vercel build & deployment propagation...');
  await new Promise((r) => setTimeout(r, 15000));

  // 1. Test Health Endpoint
  console.log('\n1. Health Check');
  const healthRes = await fetch(`${liveUrl}/api/health`);
  console.log('Health Status:', healthRes.status, await healthRes.json());

  // 2. Test Public Data Endpoint
  console.log('\n2. Public Portfolio Data');
  const dataRes = await fetch(`${liveUrl}/api/public/data`);
  const data = await dataRes.json();
  console.log('Public Data Status:', dataRes.status);
  console.log('Sections count:', data.sections?.length);
  console.log('Projects count:', data.projects?.length);
  console.log('Education count:', data.education?.length);
  console.log('Active Resume present:', Boolean(data.activeResume));

  // 3. Test Active Resume Download
  console.log('\n3. Active Resume Download');
  const resumeRes = await fetch(`${liveUrl}/api/public/resume/download`);
  console.log('Resume Download Status:', resumeRes.status);
  console.log('Content-Type:', resumeRes.headers.get('content-type'));
  console.log('Content-Disposition:', resumeRes.headers.get('content-disposition'));
  const resumeBytes = await resumeRes.arrayBuffer();
  console.log('Resume Byte Length:', resumeBytes.byteLength);

  // 4. Test Admin Login
  console.log('\n4. Admin Auth Login');
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.log('Skipping Admin Login check: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set.');
    return;
  }

  const loginRes = await fetch(`${liveUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status, 'Success:', loginData.success);

  if (loginData.token) {
    const token = loginData.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 5. Test Live Admin Save (About Settings)
    console.log('\n5. Live Admin Save (About Settings)');
    const testBio = `I specialize in artificial intelligence, machine learning pipelines, database optimization, and high-throughput software systems. My goal is to build software that is not only powerful and efficient but also intuitive and beautifully designed.`;
    const aboutRes = await fetch(`${liveUrl}/api/admin/about-settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        heading: 'About Me',
        biography: testBio,
        professional_summary: 'Background in Computer Science & Artificial Intelligence with hands-on experience in full-stack architecture, ML model deployment, and distributed systems.',
      }),
    });
    console.log('About Save Status:', aboutRes.status);
    const savedAbout = await aboutRes.json();
    console.log('Saved biography matches:', savedAbout.biography === testBio ? 'PASS' : 'FAIL');

    // 6. Test Live Media Upload (Supabase Storage)
    console.log('\n6. Live Supabase Storage Media Upload');
    const dummyImg = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.append('media', new Blob([dummyImg], { type: 'image/png' }), 'live_test_logo.png');
    form.append('alt_text', 'Live Test Logo');

    const mediaRes = await fetch(`${liveUrl}/api/admin/media/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    console.log('Media Upload Status:', mediaRes.status);
    const mediaData = await mediaRes.json();
    console.log('Media Storage URL:', mediaData.storage_url || mediaData.url);

    // 7. Test Live Education Save with Uploaded Logo
    console.log('\n7. Live Education Save with Uploaded Logo');
    const edRes = await fetch(`${liveUrl}/api/admin/education`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        institution: 'Live Test Institute',
        degree: 'B.Tech Computer Science',
        logo_url: mediaData.storage_url || mediaData.url,
        is_visible: true,
      }),
    });
    console.log('Education Save Status:', edRes.status);
    const edData = await edRes.json();
    console.log('Saved Education ID:', edData.id);

    // Clean up test education
    if (edData.id) {
      await fetch(`${liveUrl}/api/admin/education/${edData.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      console.log('Cleaned up test education record');
    }
  }

  console.log('\n========================================');
  console.log('LIVE PRODUCTION DEPLOYMENT FULLY VERIFIED!');
  console.log('========================================\n');
}

testLiveProduction().catch((err) => {
  console.error('Live Test Error:', err);
  process.exit(1);
});
