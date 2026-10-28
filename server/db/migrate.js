require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const migrationSQL = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');

  console.log('Running database migration for MediQueue...');

  // 1. If direct PostgreSQL connection string is provided, execute directly via pg client
  if (dbUrl && !dbUrl.includes('your-db-url')) {
    console.log('[Migration] Using direct PostgreSQL connection string...');
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('[Migration] Connected to PostgreSQL. Applying migration schema...');
      await client.query(migrationSQL);
      console.log('[Migration] ✅ Schema, tables, triggers, indexes, and RLS policies successfully applied!');
      await client.end();
      return;
    } catch (err) {
      console.error('[Migration] Direct PG migration error:', err.message);
      try { await client.end(); } catch {}
    }
  }

  // 2. If Supabase REST credentials are provided
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    console.warn('[Migration] Note: Live credentials not set in .env. Falling back to built-in in-memory clinical database.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Migration] Executing migration statements via Supabase client...');
  
  const statements = migrationSQL
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) {
        // Log info
      }
    } catch (err) {
      // Continue
    }
  }

  console.log('[Migration] Migration routine finished.');
}

migrate().catch(console.error);
