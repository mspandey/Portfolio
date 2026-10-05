import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from server-side environment variables
// Supports modern SUPABASE_SECRET_KEY as well as legacy SUPABASE_SERVICE_ROLE_KEY and SUPABASE_KEY
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceKey = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✅ Supabase client initialized');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials (SUPABASE_URL, SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY) not configured in server environment.');
}

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

export function getSupabase() {
  return supabase;
}

export { supabase };

/**
 * Upload a file buffer to a Supabase Storage bucket
 */
export async function uploadToStorage(bucket, storagePath, fileBuffer, mimeType = 'application/octet-stream') {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    path: storagePath,
    publicUrl: urlData?.publicUrl || '',
    data,
  };
}

/**
 * Download a file from Supabase Storage as a buffer
 */
export async function downloadFromStorage(bucket, storagePath) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from a Supabase Storage bucket
 */
export async function deleteFromStorage(bucket, storagePath) {
  if (!supabase || !storagePath) return;

  try {
    await supabase.storage.from(bucket).remove([storagePath]);
  } catch (err) {
    console.error(`Failed to delete ${storagePath} from bucket ${bucket}:`, err.message);
  }
}

export default supabase;
