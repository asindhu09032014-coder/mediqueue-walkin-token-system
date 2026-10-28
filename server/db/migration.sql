-- ============================================================
-- Walk-In Patient Token & Waiting-Time Coordination System
-- Database Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE token_status AS ENUM ('waiting', 'called', 'in_consultation', 'completed', 'skipped', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('normal', 'urgent', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  avg_consultation_minutes INTEGER NOT NULL DEFAULT 15 CHECK (avg_consultation_minutes > 0 AND avg_consultation_minutes <= 120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUNTERS TABLE (service windows/desks)
-- ============================================================
CREATE TABLE IF NOT EXISTS counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  counter_number INTEGER NOT NULL,
  label VARCHAR(50),
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, counter_number)
);

CREATE INDEX IF NOT EXISTS idx_counters_dept ON counters(department_id);
CREATE INDEX IF NOT EXISTS idx_counters_staff ON counters(assigned_staff_id);

-- ============================================================
-- TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number VARCHAR(10) NOT NULL,
  token_date DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_name VARCHAR(150) NOT NULL,
  patient_phone VARCHAR(20),
  patient_age INTEGER CHECK (patient_age > 0 AND patient_age <= 150),
  patient_gender VARCHAR(20),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
  status token_status NOT NULL DEFAULT 'waiting',
  priority priority_level NOT NULL DEFAULT 'normal',
  priority_reason TEXT,
  override_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  called_by UUID REFERENCES users(id) ON DELETE SET NULL,
  called_at TIMESTAMPTZ,
  consultation_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_wait_minutes INTEGER,
  actual_wait_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token_number, token_date)
);

CREATE INDEX IF NOT EXISTS idx_tokens_date ON tokens(token_date);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_dept ON tokens(department_id);
CREATE INDEX IF NOT EXISTS idx_tokens_priority ON tokens(priority);
CREATE INDEX IF NOT EXISTS idx_tokens_created_by ON tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_tokens_date_status ON tokens(token_date, status);
CREATE INDEX IF NOT EXISTS idx_tokens_dept_date_status ON tokens(department_id, token_date, status);

-- ============================================================
-- TOKEN EVENTS (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  from_status token_status,
  to_status token_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_events_token ON token_events(token_id);
CREATE INDEX IF NOT EXISTS idx_token_events_created ON token_events(created_at);

-- ============================================================
-- DAILY SUMMARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_date DATE NOT NULL UNIQUE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  completed_tokens INTEGER NOT NULL DEFAULT 0,
  skipped_tokens INTEGER NOT NULL DEFAULT 0,
  cancelled_tokens INTEGER NOT NULL DEFAULT 0,
  avg_wait_minutes NUMERIC(6,2),
  max_wait_minutes INTEGER,
  min_wait_minutes INTEGER,
  avg_consultation_minutes NUMERIC(6,2),
  peak_hour INTEGER,
  peak_hour_count INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(summary_date, department_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-generate token number for department on given date
CREATE OR REPLACE FUNCTION generate_token_number(dept_code VARCHAR, token_dt DATE)
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  token_num VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(token_number FROM LENGTH(dept_code) + 2) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM tokens
  WHERE token_date = token_dt
    AND token_number LIKE dept_code || '-%';
  
  token_num := dept_code || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN token_num;
END;
$$ LANGUAGE plpgsql;

-- Calculate estimated wait for a new token
CREATE OR REPLACE FUNCTION calculate_estimated_wait(dept_id UUID, pri priority_level)
RETURNS INTEGER AS $$
DECLARE
  waiting_count INTEGER;
  avg_consult INTEGER;
  active_counters INTEGER;
  est_wait INTEGER;
  priority_factor NUMERIC;
BEGIN
  -- Count tokens ahead
  SELECT COUNT(*) INTO waiting_count
  FROM tokens
  WHERE department_id = dept_id
    AND token_date = CURRENT_DATE
    AND status IN ('waiting', 'called');
  
  -- Get avg consultation time for department
  SELECT avg_consultation_minutes INTO avg_consult
  FROM departments
  WHERE id = dept_id;
  
  -- Count active counters for department
  SELECT COUNT(*) INTO active_counters
  FROM counters
  WHERE department_id = dept_id AND is_active = true;
  
  IF active_counters = 0 THEN active_counters := 1; END IF;
  
  -- Priority factor
  CASE pri
    WHEN 'emergency' THEN priority_factor := 0.1;
    WHEN 'urgent' THEN priority_factor := 0.4;
    ELSE priority_factor := 1.0;
  END CASE;
  
  est_wait := CEIL((waiting_count * avg_consult * priority_factor) / active_counters);
  RETURN est_wait;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['users', 'departments', 'counters', 'tokens'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl);
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Since we use Express + service_role key for all DB access,
-- create permissive policies for the service role
-- The Express middleware handles auth/authz

-- Allow service role full access (these apply when using service_role key)
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on departments" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on counters" ON counters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on tokens" ON tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on token_events" ON token_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on daily_summaries" ON daily_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Anon key: patients can only see their own tokens and public departments
-- (If using anon key directly from browser - we don't in this app but good practice)
