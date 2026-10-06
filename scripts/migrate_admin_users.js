import 'dotenv/config';
import Database from 'better-sqlite3';
import { supabase } from '../server/supabase.js';

async function migrateAdminUsers() {
  const db = new Database('./server/portfolio.db');
  const sqliteUsers = db.prepare('SELECT id, username, password_hash, created_at, updated_at FROM admin_users').all();
  
  console.log(`Found ${sqliteUsers.length} admin users in SQLite:`);
  sqliteUsers.forEach(u => {
    console.log(`- User: ${u.username}, hash exists: ${Boolean(u.password_hash)}, length: ${u.password_hash?.length}`);
  });

  const adminUsersData = sqliteUsers.map(u => ({
    id: String(u.id),
    username: u.username.toLowerCase(),
    display_username: u.username,
    password_hash: u.password_hash,
    role: 'admin',
    is_active: true,
    created_at: u.created_at,
    updated_at: u.updated_at || u.created_at,
  }));

  const payload = Buffer.from(JSON.stringify(adminUsersData, null, 2), 'utf8');

  // Ensure server-auth bucket exists
  try {
    await supabase.storage.createBucket('server-auth', { public: false });
  } catch (e) {
    // already exists
  }

  const { data, error } = await supabase.storage
    .from('server-auth')
    .upload('admin_users.json', payload, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    console.error('❌ Failed to upload admin_users to Supabase Storage:', error.message);
  } else {
    console.log('✅ Successfully migrated admin_users to Supabase Storage server-auth/admin_users.json');
  }

  // Verify download
  const { data: downloadData, error: dlError } = await supabase.storage
    .from('server-auth')
    .download('admin_users.json');

  if (dlError) {
    console.error('❌ Download verify failed:', dlError.message);
  } else {
    const parsed = JSON.parse(await downloadData.text());
    console.log(`✅ Download verified! Stored users in cloud:`, parsed.map(p => ({
      username: p.username,
      role: p.role,
      has_hash: Boolean(p.password_hash),
      hash_length: p.password_hash?.length,
    })));
  }
}

migrateAdminUsers();
