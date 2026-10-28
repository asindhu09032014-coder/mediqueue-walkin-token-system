# Walk-In Patient Token and Waiting-Time Coordination

> **MediQueue**: A calm, clinical web application designed to eliminate verbal walk-in queue shouting, waiting hall crowding, and patient disputes.

---

## 🏥 Problem Solved
In traditional outpatient clinics and primary healthcare centers, verbal walk-in queues cause uncertainty, crowding, and frequent disputes:
- Patients do not know their expected waiting duration or line position.
- Receptionists and nurses are forced to repeatedly shout names across noisy waiting halls, compromising patient privacy.
- Urgent or vulnerable walk-ins lack transparent priority handling, leading to friction.

**MediQueue** solves this end-to-end with:
1. **Minimal Discreet Patient Tokens** (`GM-001`, `PD-002`) preserving patient privacy.
2. **Estimated Wait with Dynamic Uncertainty** (e.g. `15 - 25 mins (approx. 20m ± 5m)`) computed from active desk counts and real historical consultation durations.
3. **Configurable Triage Priority** (`Emergency`, `Urgent`, `Normal`) with automated queue re-ordering and required clinical justifications.
4. **Mandatory Manual Override Reasons** enforcing documented audit justifications when skipping or cancelling tokens.
5. **Fullscreen Lobby Reception Queue Board** with real-time calling animations, counter direction, and audible chimes.
6. **Public Self-Service Token Tracker** allowing patients to look up their live position and wait window from their own mobile phones.
7. **Automated Daily Operational Summaries** recording patient throughput, wait times, consultation durations, and peak arrival traffic.

---

## 🛠️ System Design & Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Semantic HTML5, Custom CSS3 (Sage Clinical Design System), Vanilla JavaScript (No heavy frameworks) |
| **Backend** | Node.js & Express.js REST API with Helmet security, CORS, Rate Limiting, and input validation |
| **Database** | Supabase PostgreSQL with UUIDs, foreign keys, triggers, constraints, RLS policies, and automated migration/seed scripts |
| **Fallback Engine** | Built-in in-memory clinical database engine with pre-seeded synthetic data for instant local execution without cloud setup |
| **Authentication** | Role-based JWT authentication with bcrypt password hashing |

---

## 👥 Role Hierarchy & Pre-Seeded Demo Accounts

The application implements four role tiers with least privilege:

| Role | Demo Email | Password | Permissions & Scope |
|---|---|---|---|
| **Administrator** | `admin@mediq.demo` | `Demo@1234` | Full access: manage departments, assign counter staff, view system settings, trigger daily summaries, review full audit logs. |
| **Receptionist / Staff** | `reception1@mediq.demo` | `Demo@1234` | Issue tokens, call tokens to desks, start consultations, complete visits, skip/cancel with override justifications. |
| **Physician / Staff** | `doctor.gm@mediq.demo` | `Demo@1234` | Assigned to GM Counter 1: call patients, conduct consultations, mark visits completed. |
| **Patient / Requester** | `patient1@demo.test` | `Demo@1234` | View own tokens, self check-in (forced to normal routine priority). |
| **Public Visitor** | *(No login required)* | — | View landing page, open reception queue board, track token via token number. |

> **Evaluator Tip:** Use the 1-click **"Demo Role"** switcher at the top-right of the navigation bar to instantly switch between Admin, Reception, Doctor, and Patient roles without typing passwords.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Configure Environment (`.env`)
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` to configure your settings or connect Supabase:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=mediqueue_super_secure_jwt_token_key_2026_dev
JWT_EXPIRES_IN=8h

# Supabase Credentials (optional - falls back to pre-seeded clinical engine if empty)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### 3. Run Automated Tests
Execute the complete test suite (62 automated tests covering auth, token transitions, priority sorting, override reasons, tracker, board, and summaries):
```bash
npm test
```

### 4. Start the Application Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🗄️ Database Schema & Supabase Setup

The schema is defined in `server/db/migration.sql` and includes:
- **`users`**: UUID primary keys, role enum (`admin`, `staff`, `patient`), bcrypt password hashes.
- **`departments`**: Code, name, average consultation durations, active flags.
- **`counters`**: Service desks assigned to departments and specific staff members.
- **`tokens`**: Token numbers (`GM-001`, `PD-002`), daily unique constraints, priority level (`normal`, `urgent`, `emergency`), state (`waiting`, `called`, `in_consultation`, `completed`, `skipped`, `cancelled`), wait durations, override reasons.
- **`token_events`**: Immutable chronological audit log recording every state transition with caller identity, timestamp, and justification.
- **`daily_summaries`**: Pre-aggregated daily metrics (total walk-ins, completed, avg wait, avg consultation duration, peak arrival hour).
- **`system_settings`**: Clinic-level configuration.
- **Row Level Security (RLS)**: Enabled across all tables with service role policies.

### Running Migrations & Seeding with Supabase
1. If you provided `DATABASE_URL` or Supabase credentials in `.env`, run:
   ```bash
   npm run migrate
   npm run seed
   ```
2. Or open the **SQL Editor** in your Supabase Dashboard, paste the contents of `server/db/migration.sql`, and execute.

---

## 📡 REST API Reference

### Public Endpoints
- `GET /api/health` - Server health status
- `GET /api/settings/public` - Public clinic info & operating hours
- `GET /api/departments` - List of active clinical departments
- `GET /api/tokens/queue` - Live public reception queue board data
- `GET /api/tokens/track/:tokenNumber` - Self-service patient token tracking with uncertainty range

### Authentication
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/me` - Get current authenticated user profile
- `POST /api/auth/register` - Create patient account or admin-provisioned staff account

### Operational Tokens (Auth Required)
- `POST /api/tokens` - Issue new walk-in token (Staff/Admin or Patient self-service)
- `GET /api/tokens` - List tokens with filtering (dept, status, priority), search, and pagination
- `GET /api/tokens/:id` - Get token details
- `GET /api/tokens/:id/events` - Chronological audit trail for a token
- `PATCH /api/tokens/:id/status` - Transition token state (`called`, `in_consultation`, `completed`, `skipped`, `cancelled`). *Requires override justification for skipped/cancelled.*

### Analytics & Reporting (Staff / Admin)
- `GET /api/tokens/dashboard` - Operational metrics, priority distribution, hourly arrival chart
- `GET /api/tokens/daily-summary` - Query historical daily summary records
- `POST /api/tokens/daily-summary` - (Admin only) Trigger end-of-day summary calculation

### Desks & Settings (Admin)
- `GET /api/counters` - List service counters
- `PATCH /api/counters/:id/assign` - Assign staff to counter desk
- `GET /api/settings` - List all system settings
- `PUT /api/settings/:key` - Update clinic system configuration
