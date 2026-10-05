import 'dotenv/config';
import http from 'http';
import app from '../server/app.js';
import { uploadToStorage, isSupabaseConfigured } from '../server/supabase.js';
import jwt from 'jsonwebtoken';

async function runTests() {
  console.log('🧪 Starting Certificate Flow Verification...');
  console.log('Supabase configured:', isSupabaseConfigured());

  // 1. Start test server on random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test server running on ${baseUrl}`);

  try {
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign({ username: 'admin' }, jwtSecret, { expiresIn: '1h' });

    // 2. Test PDF upload to /api/admin/achievements/upload-certificate
    console.log('\n--- Test 1: Upload PDF Certificate ---');
    const dummyPdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    const boundary = '---------------------------' + Date.now().toString(16);
    
    let body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="certificate"; filename="Frontend_Battle_Certificate.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      Buffer.from(dummyPdf, 'utf-8'),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest Achievement\r\n`),
      Buffer.from(`--${boundary}--\r\n`)
    ]);

    const uploadRes = await fetch(`${baseUrl}/api/admin/achievements/upload-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`
      },
      body
    });

    const uploadData = await uploadRes.json();
    console.log('Upload status:', uploadRes.status);
    console.log('Upload response:', uploadData);

    if (!uploadRes.ok || !uploadData.certificate_url) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }
    console.log('✓ PDF Certificate successfully uploaded and public URL returned:', uploadData.certificate_url);

    // 3. Test Invalid File Extension Rejection (.exe)
    console.log('\n--- Test 2: Reject Unsupported File Type ---');
    const invalidBoundary = '---------------------------' + Date.now().toString(16);
    const invalidBody = Buffer.concat([
      Buffer.from(`--${invalidBoundary}\r\nContent-Disposition: form-data; name="certificate"; filename="malicious.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      Buffer.from('not an allowed certificate file', 'utf-8'),
      Buffer.from(`\r\n--${invalidBoundary}--\r\n`)
    ]);

    const invalidRes = await fetch(`${baseUrl}/api/admin/achievements/upload-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${invalidBoundary}`,
        'Authorization': `Bearer ${token}`
      },
      body: invalidBody
    });
    console.log('Invalid upload status (expected error):', invalidRes.status);
    const invalidData = await invalidRes.json();
    console.log('Invalid upload response message:', invalidData.error);
    if (invalidRes.ok) {
      throw new Error('Server accepted unsupported file format!');
    }
    console.log('✓ Unsupported file format was correctly rejected.');

    // 4. Test Public Download Proxy Endpoint
    console.log('\n--- Test 3: Public Certificate Download Proxy ---');
    const downloadRes = await fetch(`${baseUrl}/api/public/certificates/download?url=${encodeURIComponent(uploadData.certificate_url)}&filename=Test_Battle_Certificate.pdf`);
    console.log('Download status:', downloadRes.status);
    console.log('Content-Type header:', downloadRes.headers.get('content-type'));
    console.log('Content-Disposition header:', downloadRes.headers.get('content-disposition'));
    if (!downloadRes.ok || !downloadRes.headers.get('content-disposition')?.includes('attachment')) {
      throw new Error('Download proxy failed or did not return attachment headers');
    }
    console.log('✓ Public certificate download proxy returned attachment stream cleanly.');

    console.log('\n🎉 ALL CERTIFICATE FLOW TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
