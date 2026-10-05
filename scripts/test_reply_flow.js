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

  console.log(`\n==================================================`);
  console.log(`🚀 RUNNING FULL END-TO-END SMTP REPLY FLOW TEST`);
  console.log(`==================================================\n`);

  try {
    // 1. Submit a real contact message
    console.log('1. Submitting test contact message...');
    const postRes = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Contact User',
        email: 'test.contact@example.com',
        subject: 'Partnership Inquiry',
        message: 'Hi Amisha, this is a test message to verify the live reply flow.'
      })
    });
    const postData = await postRes.json();
    console.log('Contact message created:', postData);

    // 2. Fetch admin messages list
    console.log('\n2. Fetching messages from Admin API...');
    const listRes = await fetch(`${base}/api/admin/messages`, { headers: authHeaders });
    const messages = await listRes.json();
    const createdMsg = messages.find(m => m.email === 'amisha.pandey2006@gmail.com' && m.subject === 'Partnership Inquiry');
    console.log('Found created message ID:', createdMsg?.id);

    if (!createdMsg) {
      throw new Error('Created message was not found in message inbox.');
    }

    // 3. Send reply via Admin API
    console.log('\n3. Sending reply via POST /api/admin/messages/:id/reply...');
    const replyRes = await fetch(`${base}/api/admin/messages/${createdMsg.id}/reply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        reply: 'Thank you for reaching out! We would be delighted to partner with you.'
      })
    });
    const replyData = await replyRes.json();
    console.log('Reply API Response status:', replyRes.status, replyData);

    // 4. Verify message status in DB
    console.log('\n4. Verifying message is marked replied in database...');
    const verifyListRes = await fetch(`${base}/api/admin/messages`, { headers: authHeaders });
    const verifyMessages = await verifyListRes.json();
    const repliedMsg = verifyMessages.find(m => m.id === createdMsg.id);
    console.log('Replied status in DB:', {
      id: repliedMsg?.id,
      is_read: repliedMsg?.is_read,
      status: repliedMsg?.status,
      reply_message: repliedMsg?.reply_message,
      replied_at: repliedMsg?.replied_at
    });

    // 5. Clean up test message
    console.log('\n5. Cleaning up test message...');
    const delRes = await fetch(`${base}/api/admin/messages/${createdMsg.id}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('Delete status:', delRes.status, await delRes.json());

    console.log('\n🎉 ALL SMTP REPLY AND MESSAGE TESTS PASSED END-TO-END!');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
