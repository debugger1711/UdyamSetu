# UdyamSetu (उद्यमसेतु)

**Statutory Single-Window Clearance & Industrial Regulatory Compliance Platform**

UdyamSetu is a digital single-window regulatory compliance management platform connecting industrial entrepreneurs (Applicants) and statutory department regulators (Officers). It manages dynamic regulatory discovery, approval checklist generation, statutory dossier scrutiny, clarification queries, multi-departmental approval/rejection decisions, and statutory certificate issuance.

---

## Quick Start (Copy-Paste)

From a fresh clone on a machine with **Node.js 22+**, **npm 10+**, and **Docker** running:

```bash
# 1. Install dependencies
npm install

# 2. Configure environment file from the safe template
cp .env.example .env.local

# 3. Start local Supabase services (PostgreSQL 17, Auth, Kong, Studio)
npx supabase start

# 4. Apply all versioned database migrations
npx supabase migration up

# 5. Bootstrap the system administrator account
npm run admin:bootstrap

# 6. Run automated test suite (168 tests)
npm test

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 1. Project Overview

### What UdyamSetu Does
Entrepreneurs setting up industrial manufacturing units must obtain multiple statutory permissions—including environmental clearances (Consent to Establish/Operate), fire safety NOCs, MIDC land allotments, and factory building plan approvals—across disconnected regulatory authorities.

UdyamSetu integrates these statutory workflows into a unified digital bridge:
* **Dynamic Regulatory Discovery:** Evaluates project parameters (sector, pollution category, land classification, investment) to generate a customized statutory approval checklist.
* **Statutory Dossier Submission:** Submits drafted applications and project files directly into department scrutiny queues.
* **Departmental Scrutiny Desk:** Department officers review project files, risk profiles, and historical queries.
* **Clarification Queries:** Regulators issue formal clarification requests to applicants; applicants respond with audit trails.
* **Transactional Statutory Decisions:** Authorized officers record formal **Grant** or **Rejection** decisions backed by PostgreSQL Row Level Security (RLS) and security-definer procedures.
* **Multi-Approval Application Rollup:** An application is granted **only** when all required departmental approvals are granted. Rejection of any required approval marks the application rejected.
* **Statutory Certificate Issuance:** Following an approval grant, authorized officers issue official statutory certificates with unique certificate numbers.

### Technology Stack
* **Web Framework:** Next.js 16.3.6 with App Router and Turbopack
* **Language & Runtime:** TypeScript 5, React 19.2, Node.js 22+
* **Styling & Design System:** Tailwind CSS v4, Lucide React icons, shadcn/ui components
* **Database & Authentication:** PostgreSQL 17 managed via local Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
* **Validation:** Zod 4 schemas with strict runtime input parsing
* **Test Runner:** Built-in Node.js test runner (`node:test`, `node:assert/strict`)

---

## 2. Prerequisites

Ensure your development machine meets these exact requirements:

| Tool | Required Version | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | `>= 20.9.0` (Recommended: **v22+** or **v24+**) | `node -v` | Required for `--experimental-strip-types` in `npm test` |
| **npm** | `>= 10.0.0` | `npm -v` | Standard package manager |
| **Docker** | Docker Engine or Docker Desktop running | `docker info` | Required to host local Supabase containers |
| **Supabase CLI** | Bundled via `npx supabase` | `npx supabase -v` | No global install required; handled via `npx` |

---

## 3. First-Time Setup

Follow these exact steps in sequence:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Copy the safe template into your local environment file:
```bash
cp .env.example .env.local
```

The application reads from `.env.local`. Below are the required environment variables:

| Variable | Description | Local Default |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Kong API Gateway URL | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client requests | Auto-provided by `npx supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service-role key for backend admin scripts | Auto-provided by `npx supabase status` |
| `DATABASE_URL` | Direct PostgreSQL connection string | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for AI endpoints | *Leave blank if not using AI features* |

> [!CAUTION]
> Never commit `.env.local` to version control. The repository's `.gitignore` excludes `.env*` except `.env.example`.

### Step 3: Start Local Supabase
```bash
npx supabase start
```
This spins up the local Docker containers:
* Kong API Gateway: `http://127.0.0.1:54321`
* PostgreSQL 17: `127.0.0.1:54322`
* Supabase Studio: `http://127.0.0.1:54323`
* Inbucket/Mailpit (local email testing): `http://127.0.0.1:54324`

To retrieve your local keys at any time:
```bash
npx supabase status
```
If your `.env.local` keys do not match, copy the `ANON_KEY` and `SERVICE_ROLE_KEY` outputs from `npx supabase status` into `.env.local`.

### Step 4: Run Migrations
Apply the versioned SQL migrations in `supabase/migrations/`:
```bash
npx supabase migration up
```

### Step 5: Bootstrap Administrator Account
Run the CLI bootstrap script to create the initial admin user:
```bash
npm run admin:bootstrap
```
* Default Admin Email: `admin@udyamsetu.gov.in`
* Default Admin Password: `AdminUdyam#2026`

To specify custom administrator credentials:
```bash
npm run admin:bootstrap <email> <password>
```

---

## 4. Local Supabase Operations

Use these standard commands to manage the local Supabase environment:

```bash
# Start local containers
npx supabase start

# Check URLs, service status, and API keys
npx supabase status

# Apply new or pending migrations
npx supabase migration up

# View web database management console (Supabase Studio)
# Open http://localhost:54323 in your browser

# View local outgoing emails / auth confirmations
# Open http://localhost:54324 in your browser

# Stop local containers
npx supabase stop
```

---

## 5. Admin & Officer Activation Workflow

In UdyamSetu, regulatory officers cannot self-grant permissions. To preserve strict government security boundaries, the system uses a **two-step registration and activation protocol**:

```mermaid
flowchart LR
    A["1. Officer Signs Up\n(/signup)"] --> B["2. Stored as Applicant\n(Pending Lockout)"]
    B --> C["3. Admin Activates CLI\n(npm run admin:activate)"]
    C --> D["4. Role Elevated to 'officer'\nDept Assigned in DB"]
    D --> E["5. Officer Logs In\nAccesses /officer-dashboard"]
```

### 1. Officer Sign-Up
A user navigates to `/signup`, selects **Government Officer**, and completes registration. 
* Result: A standard auth account is created with `profiles.role = 'applicant'` and a row in `officer_registrations` with `status = 'pending'`.
* **Pre-Activation Lockout:** If this user logs in before activation, they are automatically routed to the applicant dashboard and strictly locked out of all officer routes (`/officer-*`).

### 2. Administrator Activation
The administrator activates the pending officer and assigns them to their statutory department using the CLI command:

```bash
npm run admin:activate <officer-email> [department-code]
```

#### Supported Department Codes:
* `MPCB` - Maharashtra Pollution Control Board
* `MIDC` - Maharashtra Industrial Development Corporation
* `FIRE_SERVICES` - Maharashtra Fire Services Directorate
* `DISH` - Directorate of Industrial Safety and Health

#### Example:
```bash
npm run admin:activate verma@state.gov.in MPCB
```

What the script does:
1. Validates the profile exists.
2. Validates the department code in `departments`.
3. Elevates `profiles.role` to `'officer'`.
4. Upserts the officer's department mapping in `officer_departments`.
5. Updates `officer_registrations.status` to `'active'`.

---

## 6. Running the Application

### Development Server
```bash
npm run dev
```
Starts the Next.js development server with Turbopack at [http://localhost:3000](http://localhost:3000).

### Production Build & Verification
```bash
# Compile and verify types
npm run build

# Start production server
npm run start
```

---

## 7. End-to-End User Journeys

### Journey A: Applicant (Industrial Entrepreneur)
1. **Register & Log In:** Register at `/signup` (Account Type: *Industrial Unit / Enterprise*), then log in at `/login`.
2. **Create Project:** Navigate to `/projects/new`. Specify project details including sector, pollution category (`white`, `green`, `orange`, or `red`), investment, and land classification (`industrial_estate`, `sez`, etc.).
3. **Generate Approvals Checklist:** On `/approvals`, click **Generate Approval Checklist** to compute the statutory clearances required for the project.
4. **Submit Application:** On `/applications/[applicationId]`, click **Submit to Departments**. The application transitions to `under_review` and creates workflow tracking instances across respective departments.
5. **Respond to Queries:** If an officer raises a clarification notice, view and reply to the query at `/messages`.
6. **Track Clearances & Certificates:** Track real-time progress on `/dashboard` and `/approvals`. Once clearances are granted and certificates issued, view them on `/renewals`.

### Journey B: Regulatory Officer (Department Desk)
1. **Sign Up & Get Activated:** Register at `/signup`, then have an administrator run `npm run admin:activate <email> <DEPT>`.
2. **Access Scrutiny Queue:** Log in to access `/officer-dashboard` and `/officer-applications`.
3. **Review Dossier:** Open an application on `/officer-applications/[applicationId]` to view applicant files, compliance notes, and active departmental workflows.
4. **Issue Query Notice:** Click **Request Clarification** to request additional information without modifying the approval status.
5. **Record Statutory Decisions:**
   * **Grant Approval:** Click **Grant Approval** to formally approve the department's clearance.
   * **Reject Application:** Click **Reject Application** and enter mandatory documented statutory grounds ($\ge 5$ characters).
6. **Issue Statutory Certificate:** When an approval is granted, click **Issue Statutory Certificate** to create the official statutory certificate record.

### State-Machine & Multi-Approval Rollup Rules
* **Multi-Approval Isolation:** Granting one departmental approval (e.g. MPCB) does **NOT** grant the entire application. The parent application remains in `under_review` until all other required departmental approvals (e.g. MIDC, Fire Services, DISH) are granted.
* **Full Grant:** The parent application automatically transitions to `granted` only when **all** required departmental approvals are granted.
* **Immediate Rejection:** Rejection of any required departmental approval immediately transitions the parent application status to `rejected`.
* **State Immutability:** Once a workflow is finalized (`granted` or `rejected`), conflicting re-decisions are blocked.

---

## 8. Authorization & Security Model

UdyamSetu enforces a multi-tiered security model:

1. **Role-Based Access Control (RBAC):**
   * Role claims are validated server-side on every request via `getAuthenticatedUser()`.
   * Applicants attempting to access `/officer-*` routes or `/api/department-workflows/*/decision` are denied with HTTP 403.
   * Officers attempting to access applicant creation routes are isolated.
2. **Departmental Jurisdiction:**
   * An officer assigned to `MIDC` cannot approve or reject workflows belonging to `MPCB` or `FIRE_SERVICES`. Cross-department actions are blocked at both the API route and database RPC levels with HTTP 403 (*"officer is not assigned to this department"*).
3. **Transactional Database Procedures:**
   * Statutory decisions are processed through PostgreSQL security-definer RPC `record_department_decision()`.
   * Direct table updates on `applications` are protected by the `protect_application_workflow` trigger, requiring transactional authorization flags.
4. **Service Role Boundary:**
   * The Supabase `service_role` key is strictly restricted to server-only admin modules (`lib/supabase/admin.ts` and CLI scripts).
   * Verified by automated security test `tests/env-safety.test.ts`.

---

## 9. Quality Verification & Testing

Every commit and change is validated against automated test suites, linting, and build verification:

```bash
# 1. Run all unit and integration tests (168 tests across 65 suites)
npm test

# 2. Run ESLint checks
npm run lint

# 3. Verify production compilation and TypeScript types
npm run build
```

### Current Verified Quality State:
* **Automated Tests:** **168 passed, 0 failed** (100% pass rate).
* **ESLint:** **0 errors, 0 warnings**.
* **Next.js Production Build:** Clean Turbopack compilation with static page optimization.

---

## 10. Runtime Verification Suite

To verify the live application against the local Supabase stack end-to-end, execute the verified integration script:

```bash
node scripts/verify-phase11.mjs
```

### What `verify-phase11.mjs` Tests:
1. Authenticates real applicant and officer accounts via session cookies.
2. Creates an industrial project and files an application.
3. Generates approval checklists and submits the application.
4. Verifies cross-department authorization denial (HTTP 403).
5. Verifies applicant decision denial (HTTP 403).
6. Verifies short-remarks rejection validation (HTTP 400).
7. Grants an approval and asserts multi-approval state rollup (application remains `under_review`).
8. Verifies cross-department certificate issuance denial (HTTP 403).
9. Issues a statutory certificate and verifies row creation in PostgreSQL.
10. Verifies duplicate certificate prevention (HTTP 409).
11. Verifies contradictory state change prevention (HTTP 409).
12. Grants remaining required approvals and verifies the application transitions to `granted`.
13. Files a second application, records a statutory rejection, and verifies application transitions to `rejected`.
14. Verifies certificate issuance is blocked on rejected approvals (HTTP 409).

---

## 11. Troubleshooting

### 1. `{"error": "Authentication is not configured."}` (HTTP 503)
* **Cause:** `.env.local` is missing or `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set.
* **Fix:** Run `cp .env.example .env.local`. Run `npx supabase status` and ensure the values match.

### 2. Connection Refused on Port 54321 / 54322
* **Cause:** Local Supabase Docker containers are not running.
* **Fix:** Ensure Docker is running, then run `npx supabase start`.

### 3. Officer Redirected to Applicant Dashboard
* **Cause:** The officer account was created via `/signup` but has not yet been activated by an administrator.
* **Fix:** Run `npm run admin:activate <officer-email> <DEPT_CODE>`.

### 4. `HTTP 403: "officer is not assigned to this department"`
* **Cause:** The logged-in officer belongs to a different department than the workflow being reviewed.
* **Fix:** Log in as an officer assigned to the specific department or as an administrator.

### 5. `HTTP 409: "approval decision required"` on Certificate Issuance
* **Cause:** Certificate issuance was attempted on an approval that is still `pending` or has been `rejected`.
* **Fix:** Statutory certificates can only be issued downstream of an approval that has been formally `granted`.

### 6. Port Conflicts (e.g. Port 3000 or 54321 already in use)
* **Fix:** Check running processes using `lsof -i :3000` or `docker ps`. Stop conflicting services or containers.

---

## 12. Project Structure

```text
UdyamSetu/
├── app/                                    # Next.js App Router
│   ├── (auth)/                             # Login and Signup portals
│   ├── (applicant)/                        # Applicant dashboard, projects, approvals, renewals
│   ├── (officer)/                          # Officer command center, queue, review desk
│   └── api/                                # Backend API routes
│       ├── auth/                           # Login, signup, session, registrations
│       ├── projects/                       # Projects and project applications
│       ├── applications/                   # Application submission and checklist generation
│       ├── department-workflows/           # Scrutiny queries and statutory decisions
│       └── approvals/                      # Downstream statutory certificate issuance
├── components/                             # UI components (shadcn/ui, layout shells, badges)
├── lib/                                    # Domain logic and database access
│   ├── auth/                               # Session helpers, auth schemas, HTTP error handlers
│   ├── workflow/                           # Department workflow server actions and RPC callers
│   ├── applications/                       # Application record formatting and status labels
│   ├── approvals/                          # Regulatory catalog, checklist mapper, planning rules
│   ├── certificates/                       # Certificate queries and visibility filters
│   └── supabase/                           # Server, client, and admin Supabase instances
├── supabase/                               # Database configuration and migrations
│   ├── config.toml                         # Local ports and Supabase service settings
│   └── migrations/                         # SQL migrations (schema, RLS, functions, triggers)
├── scripts/                                # Operational CLI tooling
│   ├── bootstrap-admin.mjs                 # Admin user provisioning script
│   ├── activate-officer.mjs                # Officer activation and department assignment
│   └── verify-phase11.mjs                  # End-to-end live runtime verification suite
└── tests/                                  # Automated unit, integration, and security tests
```

---

## 13. Current Limitations & Out of Scope

To ensure complete transparency regarding the project's current state:

* **Admin Web UI:** There is currently no web-based dashboard for administrators. User elevation, officer activations, and department assignments are performed via the CLI tools (`npm run admin:bootstrap`, `npm run admin:activate`).
* **Project Form Inputs:** The onboarding form collects the 8 core parameters required for regulatory evaluation (name, entity, sector, pollution category, investment, stage, location, land classification). Additional technical parameters (e.g., plot coordinates, water consumption figures, boiler specifications) are schema-ready but not yet exposed in the web form.
* **Statutory Certificates:** Certificates are issued as verifiable database records (`public.certificates`) with unique IDs, timestamps, and officer audit trails. Binary PDF document generation and digital cryptographic signing are scheduled for subsequent phases.
* **AI Regulatory Assistant:** AI endpoints (`/api/ai/ask`, `/api/documents/analyze`) are optional stubs that activate only when `GEMINI_API_KEY` is provided.

---

## 14. Contribution & Development Guidelines

1. **Migration Immutability:** Never modify existing historical migrations in `supabase/migrations/`. Always create a new sequential SQL migration file for database changes.
2. **Service Role Key Safety:** Never import or reference `SUPABASE_SERVICE_ROLE_KEY` in client components or shared modules. All administrative operations must remain inside `lib/supabase/admin.ts` or standalone `.mjs` scripts.
3. **No Mocks in Production Paths:** Do not introduce mock arrays or fake data into production routes. All user data, workflows, and decisions must interact with PostgreSQL.
4. **Mandatory Verification Gate:** Before submitting any change, ensure all three quality gates pass:
   ```bash
   npm test && npm run lint && npm run build
   ```
