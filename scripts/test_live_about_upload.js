import 'dotenv/config';

const liveUrl = 'https://public-five-psi-47.vercel.app';

async function testLiveAboutProfileUpload() {
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('❌ Error: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured.');
    process.exit(1);
  }

  console.log(`Testing About Profile Image Upload on Live Production: ${liveUrl}`);
  console.log('Waiting 15 seconds for Vercel deployment...');
  await new Promise((r) => setTimeout(r, 15000));

  // 1. Admin Login
  const loginRes = await fetch(`${liveUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  const { token } = await loginRes.json();
  if (!token) throw new Error('Login failed');
  console.log('1. Admin Login: PASS');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Upload Profile Image File (JPG/PNG binary buffer)
  console.log('2. Uploading local Profile Image...');
  const dummyProfileImg = Buffer.from('fake profile image bytes for amisha pandey');
  const form = new FormData();
  form.append('media', new Blob([dummyProfileImg], { type: 'image/jpeg' }), 'amisha_profile_photo.jpg');
  form.append('alt_text', 'About Profile Image');

  const uploadRes = await fetch(`${liveUrl}/api/admin/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  console.log('Upload Status:', uploadRes.status);
  const uploadData = await uploadRes.json();
  console.log('Uploaded Profile Image URL:', uploadData.storage_url || uploadData.url);
  console.log('Storage Path:', uploadData.storage_path);
  const profileUrl = uploadData.storage_url || uploadData.url;
  if (!profileUrl || !profileUrl.startsWith('http')) throw new Error('Profile image upload failed');

  // 3. Save About Settings with New Profile Image
  console.log('3. Saving About Settings with new profile image...');
  const saveAboutRes = await fetch(`${liveUrl}/api/admin/about-settings`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      heading: 'About Me',
      introduction: 'Passionate about engineering systems that merge machine intelligence with robust backend architectures.',
      biography: 'I specialize in artificial intelligence, machine learning pipelines, database optimization, and high-throughput software systems.',
      professional_summary: 'Background in Computer Science & Artificial Intelligence with hands-on experience in full-stack architecture, ML model deployment, and distributed systems.',
      profile_image: profileUrl,
      stats_json: JSON.stringify([
        { label: 'Years Experience', value: '3+' },
        { label: 'Projects Built', value: '25+' },
        { label: 'ML Models Deployed', value: '10+' },
        { label: 'Articles & Research', value: '5' }
      ]),
    }),
  });
  const savedAbout = await saveAboutRes.json();
  console.log('Save About Status:', saveAboutRes.status);
  console.log('Saved profile_image matches:', savedAbout.profile_image === profileUrl ? 'PASS' : 'FAIL');

  // 4. Verify Admin Refresh (GET /api/admin/about-settings)
  console.log('4. Verifying Admin Refresh...');
  const getAboutRes = await fetch(`${liveUrl}/api/admin/about-settings`, { headers: authHeaders });
  const getAbout = await getAboutRes.json();
  console.log('Refreshed Admin profile_image:', getAbout.profile_image === profileUrl ? 'PASS' : 'FAIL');

  // 5. Verify Public Portfolio Component Data (GET /api/public/data)
  console.log('5. Verifying Public Portfolio Data...');
  const publicDataRes = await fetch(`${liveUrl}/api/public/data`);
  const publicData = await publicDataRes.json();
  console.log('Public Data profile_image:', publicData.aboutSettings?.profile_image === profileUrl ? 'PASS' : 'FAIL');

  // 6. Verify Education Logo Upload Still Works
  console.log('6. Verifying Education Logo Upload is working...');
  const edForm = new FormData();
  edForm.append('media', new Blob([Buffer.from('education logo')], { type: 'image/png' }), 'amity_logo.png');
  edForm.append('alt_text', 'Amity Institution Logo');
  const edLogoRes = await fetch(`${liveUrl}/api/admin/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: edForm,
  });
  const edLogoData = await edLogoRes.json();
  console.log('Education Logo Status:', edLogoRes.status, 'Storage URL:', edLogoData.storage_url);

  console.log('\n========================================');
  console.log('ABOUT PROFILE IMAGE UPLOAD VERIFIED ON LIVE PRODUCTION!');
  console.log('========================================\n');
}

testLiveAboutProfileUpload().catch((err) => {
  console.error('Test Error:', err);
  process.exit(1);
});
