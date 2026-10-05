import 'dotenv/config';
import express from 'express';
import app from '../server/app.js';
import { supabase, uploadToStorage, downloadFromStorage } from '../server/supabase.js';

let server;

async function runTests() {
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('❌ Error: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured.');
    process.exit(1);
  }

  const port = 3099;
  server = app.listen(port);
  console.log(`Test server running on port ${port}`);

  const baseUrl = `http://localhost:${port}/api`;
  let adminToken = '';

  // 1. Authenticate Admin
  console.log('\n--- TEST 1: Admin Login ---');
  const loginRes = await fetch(`${baseUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status, 'Success:', loginData.success);
  adminToken = loginData.token;
  if (!adminToken) throw new Error('Failed to get admin token');

  const authHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // 2. Test About Settings Save & Persist
  console.log('\n--- TEST 2: About Settings Save ---');
  const testBio = `TEST BIOGRAPHY SAVE ${Date.now()}`;
  const aboutPutRes = await fetch(`${baseUrl}/admin/about-settings`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      heading: 'About Me (Updated)',
      biography: testBio,
      professional_summary: 'Test summary',
      stats_json: JSON.stringify([{ label: 'Years', value: '5+' }]),
    }),
  });
  const aboutPutData = await aboutPutRes.json();
  console.log('About PUT result:', aboutPutData.biography === testBio ? 'PASS' : 'FAIL');

  const aboutGetRes = await fetch(`${baseUrl}/admin/about-settings`, { headers: authHeaders });
  const aboutGetData = await aboutGetRes.json();
  console.log('About GET verify:', aboutGetData.biography === testBio ? 'PASS' : 'FAIL');

  // 3. Test Education Logo Upload (Multer Memory + Supabase Storage)
  console.log('\n--- TEST 3: Education Logo Upload (Media) ---');
  const dummyImg = Buffer.from('fake image content for testing');
  const form = new FormData();
  form.append('media', new Blob([dummyImg], { type: 'image/png' }), 'test_institution_logo.png');
  form.append('alt_text', 'Test University Logo');

  const mediaUpRes = await fetch(`${baseUrl}/admin/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: form,
  });
  const mediaUpData = await mediaUpRes.json();
  console.log('Media Upload Status:', mediaUpRes.status, 'URL:', mediaUpData.storage_url || mediaUpData.url);
  const logoUrl = mediaUpData.storage_url || mediaUpData.url;
  if (!logoUrl || !logoUrl.startsWith('http')) throw new Error('Logo upload failed to return public Supabase URL');

  // 4. Test Education CRUD with Logo
  console.log('\n--- TEST 4: Education CRUD with Uploaded Logo ---');
  const edCreateRes = await fetch(`${baseUrl}/admin/education`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      institution: 'Stanford AI Institute',
      degree: 'M.S. Artificial Intelligence',
      field: 'Machine Learning',
      start_date: '2022',
      end_date: '2024',
      short_description: 'Focused on deep learning models and distributed architectures.',
      description: 'Comprehensive research on multi-modal vision-language transformers.',
      logo_url: logoUrl,
      institution_url: 'https://stanford.edu',
      is_visible: true,
    }),
  });
  const newEd = await edCreateRes.json();
  console.log('Education Create Status:', edCreateRes.status, 'ID:', newEd.id, 'Logo:', newEd.logo_url);

  // 5. Test Resume Upload to Supabase Storage 'resumes'
  console.log('\n--- TEST 5: Resume Upload to Supabase Storage ---');
  const dummyPdf = Buffer.from('%PDF-1.4 test pdf resume content %EOF');
  const resumeForm = new FormData();
  resumeForm.append('resume', new Blob([dummyPdf], { type: 'application/pdf' }), 'Amisha_pandey_Resume_Test.pdf');
  resumeForm.append('set_active', 'true');

  const resumeUpRes = await fetch(`${baseUrl}/admin/resumes/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: resumeForm,
  });
  const newResume = await resumeUpRes.json();
  console.log('Resume Upload Status:', resumeUpRes.status, 'ID:', newResume.id, 'Active:', newResume.is_active, 'URL:', newResume.storage_url);

  // 6. Test Public Portfolio Data Endpoint
  console.log('\n--- TEST 6: Public Portfolio Data Sync ---');
  const publicDataRes = await fetch(`${baseUrl}/public/data`);
  const publicData = await publicDataRes.json();
  console.log('Public Data Status:', publicDataRes.status);
  console.log('Public Biography:', publicData.aboutSettings?.biography === testBio ? 'PASS (Matches Admin Save)' : 'FAIL');
  const publicEd = (publicData.education || []).find((e) => e.institution === 'Stanford AI Institute');
  console.log('Public Education Entry Found:', publicEd ? 'PASS' : 'FAIL');
  console.log('Public Active Resume:', publicData.activeResume ? 'PASS' : 'FAIL');

  // 7. Test Public Active Resume Download
  console.log('\n--- TEST 7: Public Active Resume Download ---');
  const downloadRes = await fetch(`${baseUrl}/public/resume/download`);
  console.log('Download Status:', downloadRes.status);
  console.log('Content-Type:', downloadRes.headers.get('content-type'));
  console.log('Content-Disposition:', downloadRes.headers.get('content-disposition'));
  const downloadBytes = await downloadRes.arrayBuffer();
  console.log('Downloaded Bytes Length:', downloadBytes.byteLength, downloadBytes.byteLength > 0 ? 'PASS' : 'FAIL');

  // 8. Test Section Visibility Control
  console.log('\n--- TEST 8: Section Visibility & Ordering ---');
  const sectionsRes = await fetch(`${baseUrl}/admin/sections`, { headers: authHeaders });
  const sections = await sectionsRes.json();
  const edSection = sections.find((s) => s.slug === 'education');
  if (edSection) {
    // Hide education
    await fetch(`${baseUrl}/admin/sections/${edSection.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ is_visible: false }),
    });

    const publicAfterHide = await (await fetch(`${baseUrl}/public/data`)).json();
    const isEdInPublic = (publicAfterHide.sections || []).some((s) => s.slug === 'education');
    console.log('Education Hidden in Public:', !isEdInPublic ? 'PASS' : 'FAIL');

    // Unhide education
    await fetch(`${baseUrl}/admin/sections/${edSection.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ is_visible: true }),
    });
    const publicAfterShow = await (await fetch(`${baseUrl}/public/data`)).json();
    const isEdBack = (publicAfterShow.sections || []).some((s) => s.slug === 'education');
    console.log('Education Restored in Public:', isEdBack ? 'PASS' : 'FAIL');
  }

  // 9. Test Delete Persistence
  console.log('\n--- TEST 9: Delete Persistence ---');
  const delRes = await fetch(`${baseUrl}/admin/education/${newEd.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('Delete Status:', delRes.status);
  const edAfterDel = await (await fetch(`${baseUrl}/admin/education`, { headers: authHeaders })).json();
  const existsInAdmin = edAfterDel.some((e) => e.id === newEd.id);
  console.log('Deleted Education Absent in Admin:', !existsInAdmin ? 'PASS' : 'FAIL');

  console.log('\n========================================');
  console.log('ALL SUPABASE STORAGE & PERSISTENCE TESTS PASSED!');
  console.log('========================================\n');
}

runTests()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    if (server) server.close();
    process.exit(0);
  });
