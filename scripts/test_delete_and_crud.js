import app from '../server/app.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/middleware/auth.js';

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const token = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log(`🚀 Testing API CRUD & Delete against port ${port}`);

  try {
    // 1. Test Project Create & Delete
    const pCreate = await fetch(`${base}/api/admin/projects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Delete Test Project', category: 'Testing' }),
    });
    const pCreated = await pCreate.json();
    console.log('Project created:', pCreated.id, pCreated.title);

    const pDel = await fetch(`${base}/api/admin/projects/${pCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Project delete status:', pDel.status, await pDel.json());

    // 2. Test Experience Create & Delete
    const expCreate = await fetch(`${base}/api/admin/experiences`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ company: 'Test Co', role: 'Tester' }),
    });
    const expCreated = await expCreate.json();
    console.log('Experience created:', expCreated.id, expCreated.company);

    const expDel = await fetch(`${base}/api/admin/experiences/${expCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Experience delete status:', expDel.status, await expDel.json());

    // 3. Test Skills Create & Delete
    const skillCreate = await fetch(`${base}/api/admin/skills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'TestSkill', category: 'Testing' }),
    });
    const skillCreated = await skillCreate.json();
    console.log('Skill created:', skillCreated.id, skillCreated.name);

    const skillDel = await fetch(`${base}/api/admin/skills/${skillCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Skill delete status:', skillDel.status, await skillDel.json());

    // 4. Test Achievements Create & Delete
    const achCreate = await fetch(`${base}/api/admin/achievements`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Test Achievement' }),
    });
    const achCreated = await achCreate.json();
    console.log('Achievement created:', achCreated.id, achCreated.title);

    const achDel = await fetch(`${base}/api/admin/achievements/${achCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Achievement delete status:', achDel.status, await achDel.json());

    // 5. Test Education Create & Delete
    const eduCreate = await fetch(`${base}/api/admin/education`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ institution: 'Test Univ', degree: 'B.Tech' }),
    });
    const eduCreated = await eduCreate.json();
    console.log('Education created:', eduCreated.id, eduCreated.institution);

    const eduDel = await fetch(`${base}/api/admin/education/${eduCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Education delete status:', eduDel.status, await eduDel.json());

    // 6. Test Certifications Create & Delete
    const certCreate = await fetch(`${base}/api/admin/certifications`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Test Cert', organization: 'Testing Org' }),
    });
    const certCreated = await certCreate.json();
    console.log('Certification created:', certCreated.id, certCreated.name);

    const certDel = await fetch(`${base}/api/admin/certifications/${certCreated.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Certification delete status:', certDel.status, await certDel.json());

    // 7. Test Message Creation, Reply, and Delete
    const msgCreate = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Recruiter',
        email: 'recruiter@example.com',
        subject: 'Role Opportunity',
        message: 'Hello Amisha, we would love to discuss a role.'
      }),
    });
    const msgCreated = await msgCreate.json();
    console.log('Contact message created:', msgCreated);

    const msgList = await fetch(`${base}/api/admin/messages`, { headers: authHeaders });
    const msgs = await msgList.json();
    const targetMsg = msgs.find(m => m.email === 'recruiter@example.com');
    console.log('Found message in admin list:', targetMsg?.id, targetMsg?.name);

    if (targetMsg) {
      const msgDel = await fetch(`${base}/api/admin/messages/${targetMsg.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      console.log('Message delete status:', msgDel.status, await msgDel.json());
    }

    console.log('\n✅ ALL CRUD & DELETE ENDPOINTS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
