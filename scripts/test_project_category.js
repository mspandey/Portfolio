import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../server/data-service.js';

async function runTests() {
  console.log('==============================================');
  console.log('RUNNING PROJECT CATEGORY BACKEND & LOGIC TESTS');
  console.log('==============================================\n');

  // Test 1: Create project with No Category (empty string or undefined)
  console.log('--- TEST 1: New Project with No Category (empty string) ---');
  const p1 = await createProject({
    title: 'Test Empty Category Project',
    slug: `test-empty-${Date.now()}`,
    category: '',
  });
  console.log('Created project 1 category:', JSON.stringify(p1.category));
  if (p1.category === '') {
    console.log('✓ PASS: Category is empty string (NOT AI/ML)');
  } else {
    console.error('✗ FAIL: Expected empty string, got', p1.category);
    process.exit(1);
  }

  // Test 2: Create project with AI/ML
  console.log('\n--- TEST 2: New Project with explicit AI/ML ---');
  const p2 = await createProject({
    title: 'Test AI/ML Project',
    slug: `test-aiml-${Date.now()}`,
    category: 'AI/ML',
  });
  console.log('Created project 2 category:', JSON.stringify(p2.category));
  if (p2.category === 'AI/ML') {
    console.log('✓ PASS: Category is "AI/ML"');
  } else {
    console.error('✗ FAIL: Expected "AI/ML", got', p2.category);
    process.exit(1);
  }

  // Test 3: Create project with IoT
  console.log('\n--- TEST 3: New Project with IoT ---');
  const p3 = await createProject({
    title: 'Test IoT Project',
    slug: `test-iot-${Date.now()}`,
    category: 'IoT',
  });
  console.log('Created project 3 category:', JSON.stringify(p3.category));
  if (p3.category === 'IoT') {
    console.log('✓ PASS: Category is "IoT"');
  } else {
    console.error('✗ FAIL: Expected "IoT", got', p3.category);
    process.exit(1);
  }

  // Test 4: Create project with Custom Category "Gesture & Interaction"
  console.log('\n--- TEST 4: New Project with Custom Category "Gesture & Interaction" ---');
  const p4 = await createProject({
    title: 'Test Gesture Project',
    slug: `test-gesture-${Date.now()}`,
    category: '   Gesture & Interaction   ',
  });
  console.log('Created project 4 category:', JSON.stringify(p4.category));
  if (p4.category === 'Gesture & Interaction') {
    console.log('✓ PASS: Category is trimmed "Gesture & Interaction"');
  } else {
    console.error('✗ FAIL: Expected "Gesture & Interaction", got', p4.category);
    process.exit(1);
  }

  // Test 5: Update project: Change AI/ML -> Custom Category "Interactive Systems"
  console.log('\n--- TEST 5: Update AI/ML -> "Interactive Systems" ---');
  const p2Updated = await updateProject(p2.id, {
    category: 'Interactive Systems',
  });
  console.log('Updated project 2 category:', JSON.stringify(p2Updated.category));
  if (p2Updated.category === 'Interactive Systems') {
    console.log('✓ PASS: Updated to "Interactive Systems"');
  } else {
    console.error('✗ FAIL: Expected "Interactive Systems", got', p2Updated.category);
    process.exit(1);
  }

  // Test 6: Update project: Change Custom Category -> No Category
  console.log('\n--- TEST 6: Update Custom Category -> No Category ("") ---');
  const p4Updated = await updateProject(p4.id, {
    category: '',
  });
  console.log('Updated project 4 category:', JSON.stringify(p4Updated.category));
  if (p4Updated.category === '') {
    console.log('✓ PASS: Updated to empty string (No Category)');
  } else {
    console.error('✗ FAIL: Expected "", got', p4Updated.category);
    process.exit(1);
  }

  // Test 7: Verify persistence by fetching all projects from authoritative store
  console.log('\n--- TEST 7: Verify Persistence from Database Store ---');
  const allProjects = await getAllProjects();
  const fetchedP1 = allProjects.find((p) => String(p.id) === String(p1.id));
  const fetchedP2 = allProjects.find((p) => String(p.id) === String(p2.id));
  const fetchedP3 = allProjects.find((p) => String(p.id) === String(p3.id));
  const fetchedP4 = allProjects.find((p) => String(p.id) === String(p4.id));

  console.log('Fetched P1 category:', JSON.stringify(fetchedP1?.category));
  console.log('Fetched P2 category:', JSON.stringify(fetchedP2?.category));
  console.log('Fetched P3 category:', JSON.stringify(fetchedP3?.category));
  console.log('Fetched P4 category:', JSON.stringify(fetchedP4?.category));

  if (
    fetchedP1?.category === '' &&
    fetchedP2?.category === 'Interactive Systems' &&
    fetchedP3?.category === 'IoT' &&
    fetchedP4?.category === ''
  ) {
    console.log('✓ PASS: All project categories persisted accurately!');
  } else {
    console.error('✗ FAIL: Inconsistent persistence state');
    process.exit(1);
  }

  // Clean up temporary test projects
  console.log('\n--- CLEANING UP TEST PROJECTS ---');
  await deleteProject(p1.id);
  await deleteProject(p2.id);
  await deleteProject(p3.id);
  await deleteProject(p4.id);
  console.log('✓ Temporary test projects deleted successfully.');

  console.log('\n==============================================');
  console.log('ALL CATEGORY BACKEND TESTS PASSED SUCCESSFULLY');
  console.log('==============================================');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
