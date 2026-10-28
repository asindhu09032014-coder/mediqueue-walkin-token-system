global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseServiceKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://');

let supabaseAdmin;
let supabaseAnon;

if (isSupabaseConfigured) {
  console.log(`[Database] Connecting to live Supabase PostgreSQL at: ${supabaseUrl}`);
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: require('ws') }
    });
    supabaseAnon = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { transport: require('ws') }
    }) : null;
  } catch (err) {
    console.error('[Database] Failed to initialize Supabase client:', err.message);
  }
}

if (!supabaseAdmin) {
  console.log('[Database] Live Supabase credentials not detected or placeholder. Activating operational in-memory fallback engine with synthetic clinical dataset.');
  const createMemoryClient = require('../db/memoryStore');
  supabaseAdmin = createMemoryClient();
  supabaseAnon = supabaseAdmin;
}

module.exports = { supabaseAdmin, supabaseAnon, isSupabaseConfigured };
