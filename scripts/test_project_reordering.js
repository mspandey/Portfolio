import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/middleware/auth.js';
import { getCmsState } from '../server/data-service.js';

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Project Reordering Validation Suite...\n');

  // 1. Security Check: Unauthenticated access must return 401 JSON (never HTML)
  console.log('Step 1: Testing Security (Unauthenticated access)...');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/projects/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: 'test', display_order: 1 }]),
  });

  const contentType = unauthRes.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Security failed: expected application/json but got ${contentType}`);
  }
  if (unauthRes.status !== 401) {
    throw new Error(`Security failed: expected status 401, got ${unauthRes.status}`);
  }
  const unauthBody = await unauthRes.json();
  if (unauthBody.success !== false) {
    throw new Error(`Security failed: unexpected response body: ${JSON.stringify(unauthBody)}`);
  }
  console.log('✅ PASS: Unauthenticated access returns HTTP 401 JSON.\n');

  // 2. Perform real Admin Login to get token
  const adminUsername = process.env.TEST_ADMIN_EMAIL || process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be configured in environment variables.');
  }

  console.log('Step 2: Logging in via /api/admin/login...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    throw new Error('No token returned from login endpoint.');
  }
  console.log('✅ PASS: Admin logged in successfully.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 3. Fetch current admin projects
  console.log('Step 3: Fetching current admin projects...');
  const initialRes = await fetch(`${BASE_URL}/api/admin/projects`, { headers: authHeaders });
  const initialProjects = await initialRes.json();
  console.log(`Initial Projects (${initialProjects.length}):`);
  initialProjects.forEach((p, idx) => console.log(`  ${idx + 1}. [order: ${p.display_order}] ${p.title} (id: ${p.id})`));

  if (initialProjects.length < 2) {
    throw new Error('Need at least 2 projects to test reordering.');
  }

  const origP0 = initialProjects[0];
  const origP1 = initialProjects[1];

  // 4. Test Reordering: Move Project 1 Up (swap P0 and P1)
  console.log(`\nStep 3: Moving "${origP1.title}" UP (swapping with "${origP0.title}")...`);
  const swappedList = [...initialProjects];
  swappedList[0] = origP1;
  swappedList[1] = origP0;

  const reorderPayload = swappedList.map((p, idx) => ({
    id: p.id,
    display_order: idx + 1,
  }));

  const reorderRes = await fetch(`${BASE_URL}/api/admin/projects/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(reorderPayload),
  });

  if (!reorderRes.ok) {
    const errText = await reorderRes.text();
    throw new Error(`Reorder API failed with ${reorderRes.status}: ${errText}`);
  }

  const reorderResult = await reorderRes.json();
  if (!reorderResult.success) {
    throw new Error(`Reorder returned success: false: ${JSON.stringify(reorderResult)}`);
  }
  console.log('✅ PASS: Reorder API returned success: true.');

  // 5. Test Persistence: Refresh Admin Projects and verify
  console.log('\nStep 4: Verifying persistence in Admin API after reload...');
  const refreshedAdminRes = await fetch(`${BASE_URL}/api/admin/projects`, { headers: authHeaders });
  const refreshedAdminProjects = await refreshedAdminRes.json();
  
  if (refreshedAdminProjects[0].id !== origP1.id || refreshedAdminProjects[1].id !== origP0.id) {
    throw new Error(`Admin persistence mismatch! Expected [${origP1.title}, ${origP0.title}], got [${refreshedAdminProjects[0].title}, ${refreshedAdminProjects[1].title}]`);
  }
  if (refreshedAdminProjects[0].display_order !== 1 || refreshedAdminProjects[1].display_order !== 2) {
    throw new Error(`Display order incorrect: P0 has ${refreshedAdminProjects[0].display_order}, P1 has ${refreshedAdminProjects[1].display_order}`);
  }
  console.log('✅ PASS: Admin projects reflect new order and display_order (1, 2) persisted.');

  // 6. Test Database / Cloud State Source of Truth
  console.log('\nStep 5: Verifying database/storage state is source of truth...');
  const state = await getCmsState(true);
  const dbP0 = state.projects.find(p => p.id === origP1.id);
  const dbP1 = state.projects.find(p => p.id === origP0.id);
  if (dbP0.display_order !== 1 || dbP1.display_order !== 2) {
    throw new Error(`Database record mismatch: expected display_order 1 and 2, got ${dbP0.display_order} and ${dbP1.display_order}`);
  }
  console.log('✅ PASS: Database / Storage state permanently records updated display_order.');

  // 7. Test Public Portfolio Data reflects exact same order
  console.log('\nStep 6: Verifying public portfolio order (/api/public/data)...');
  const publicRes = await fetch(`${BASE_URL}/api/public/data`);
  const publicData = await publicRes.json();
  const publicProjects = publicData.projects;

  console.log(`Public Projects (${publicProjects.length}):`);
  publicProjects.forEach((p, idx) => console.log(`  ${idx + 1}. [order: ${p.display_order}] ${p.title}`));

  if (publicProjects[0].id !== origP1.id || publicProjects[1].id !== origP0.id) {
    throw new Error(`Public portfolio did not match! Expected [${origP1.title}, ${origP0.title}], got [${publicProjects[0].title}, ${publicProjects[1].title}]`);
  }
  console.log('✅ PASS: Public portfolio displays projects in exact database display_order.');

  // 8. Test New Project creation receives valid display_order at end
  console.log('\nStep 7: Testing new project creation ordering...');
  const createRes = await fetch(`${BASE_URL}/api/admin/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Temporary Test Project',
      category: 'AI/ML',
      short_description: 'For automated testing',
      technologies: ['Node.js'],
    }),
  });
  const createdProj = await createRes.json();
  const expectedNewOrder = refreshedAdminProjects.length + 1;
  if (createdProj.display_order !== expectedNewOrder) {
    throw new Error(`Expected new project display_order to be ${expectedNewOrder}, got ${createdProj.display_order}`);
  }
  console.log(`✅ PASS: New project created with display_order: ${createdProj.display_order} at end of list.`);

  // 9. Test Delete Project maintains clean sequential 1..N order
  console.log('\nStep 8: Testing project deletion maintains clean 1..N sequence...');
  const deleteRes = await fetch(`${BASE_URL}/api/admin/projects/${createdProj.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!deleteRes.ok) {
    throw new Error('Failed to delete temporary project.');
  }

  const postDeleteAdminRes = await fetch(`${BASE_URL}/api/admin/projects`, { headers: authHeaders });
  const postDeleteProjects = await postDeleteAdminRes.json();
  postDeleteProjects.forEach((p, idx) => {
    if (p.display_order !== idx + 1) {
      throw new Error(`Project ${p.title} has invalid display_order ${p.display_order}, expected ${idx + 1}`);
    }
  });
  console.log('✅ PASS: Remaining projects retain sequential 1..N order with no gaps.');

  // 10. Restore initial order
  console.log('\nStep 9: Restoring original order...');
  const restorePayload = initialProjects.map((p, idx) => ({
    id: p.id,
    display_order: idx + 1,
  }));
  await fetch(`${BASE_URL}/api/admin/projects/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(restorePayload),
  });

  const restoredRes = await fetch(`${BASE_URL}/api/admin/projects`, { headers: authHeaders });
  const restoredProjects = await restoredRes.json();
  if (restoredProjects[0].id !== origP0.id) {
    throw new Error('Failed to restore initial project order.');
  }
  console.log('✅ PASS: Original order successfully restored.');

  console.log('\n🎉 ALL 9 TEST STEPS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
