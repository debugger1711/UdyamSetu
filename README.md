# UdyamSetu (उद्यमसेतु)

**AI-Powered Industrial Approval & Compliance Management Platform**

*Smart India Hackathon Prototype • Single Window Clearance & Regulatory Intelligence*

---

## 1. What is UdyamSetu?

Entrepreneurs and industrial units setting up manufacturing facilities across India often face complex regulatory friction. They must navigate dozens of registrations, permissions, environmental clearances (Consent to Establish/Operate), fire safety NOCs, factory building plan sanctions, high-tension power line feasibility, and state/central industrial policy incentives across multiple disconnected departmental portals. Requirements vary significantly by **industrial sector**, **geographic location**, **pollution classification (White/Green/Orange/Red)**, and **investment size**.

**UdyamSetu** serves as a digital bridge between **Entrepreneurs (Applicants)** and **Regulatory Officers (Regulators)**, providing:
* **Smart Approval Discovery:** Dynamic regulatory checklist generation tailored to project parameters.
* **Approval Dependency Mapping:** Sequencing pre-requisite, parallel, and post-construction clearances.
* **Document Guidance & Pre-validation:** Verification checklists and automated defect detection before official filing.
* **Application Tracking & SLA Countdown:** Public Service Delivery Act timeline monitoring to prevent departmental bottlenecks.
* **Joint Inspection Coordination:** Synchronizing multi-departmental field inspections into single visits.
* **Incentive & Subsidy Matching:** Matching industrial units with applicable state package schemes and central PLI schemes.
* **Officer Scrutiny Desk:** Risk-based triage for regulatory officers to process applications and eliminate district-level backlogs.

---

## 2. Technology Stack

UdyamSetu is designed with a lightweight, maintainable modern web architecture:

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (Turbopack) | React framework with App Router, SSR, and API routes |
| **Language** | TypeScript | Strong type safety across domain models and APIs |
| **Styling** | Tailwind CSS v4 | Utility-first GovTech design system |
| **UI Components** | shadcn/ui & Lucide React | Accessible, polished UI primitives |
| **Database & Auth** | Supabase *(Planned)* | PostgreSQL database, Row Level Security, Auth |
| **AI Intelligence** | Google Gemini API *(Planned)* | Server-side regulatory document analysis & reasoning |
| **Data Viz & Graphs**| React Flow & Recharts *(Planned)* | Interactive dependency maps & bottleneck analytics |

> **Architecture Note:** Unnecessary heavy tools (e.g. Express microservices, MongoDB, Docker/K8s clusters, Redis/Kafka, LangChain wrappers) are deliberately omitted in favor of a clean, robust Next.js + Supabase + Gemini architecture.

---

## 3. Project Folder Structure

```text
udyamsetu/
├── app/                              # Next.js App Router root
│   ├── (auth)/                       # Authentication route group (URLs: /login, /signup)
│   │   ├── login/page.tsx            # Sign in portal
│   │   └── signup/page.tsx           # Enterprise registration
│   │
│   ├── (applicant)/                  # Applicant route group
│   │   ├── dashboard/page.tsx        # Applicant overview & KPIs
│   │   ├── projects/                 # Industrial projects management
│   │   │   ├── page.tsx              # Projects list
│   │   │   ├── new/page.tsx          # New project onboarding
│   │   │   └── [projectId]/page.tsx  # Specific project profile & clearances
│   │   ├── approvals/                # Regulatory checklist catalog
│   │   │   ├── page.tsx              # Approvals matrix
│   │   │   └── [approvalId]/page.tsx # Clearance guidelines & documents
│   │   ├── applications/             # Statutory applications tracker
│   │   │   ├── page.tsx              # Applications list & SLA deadlines
│   │   │   └── [applicationId]/page.tsx # Audit trail & stage tracker
│   │   ├── inspections/page.tsx      # Joint site inspection schedule
│   │   ├── schemes/page.tsx          # Government subsidy & scheme discovery
│   │   ├── notifications/page.tsx    # Alerts, queries, and SLA warnings
│   │   └── settings/page.tsx         # Enterprise profile & authorized signatory
│   │
│   ├── (officer)/                    # Regulatory Officer route group
│   │   ├── officer-dashboard/page.tsx# DIC / Department overview
│   │   ├── officer-applications/     # Application scrutiny console
│   │   │   ├── page.tsx              # Triage queue by pollution risk
│   │   │   └── [applicationId]/page.tsx # Dossier review & decision desk
│   │   ├── officer-inspections/page.tsx # Site inspection coordination desk
│   │   └── analytics/page.tsx        # District bottleneck & SLA performance
│   │
│   ├── api/
│   │   └── health/route.ts           # System status endpoint (/api/health)
│   │
│   ├── layout.tsx                    # Root layout with GovTech typography & metadata
│   ├── page.tsx                      # Portal landing page & prototype navigation hub
│   └── globals.css                   # GovTech color palette & design system tokens
│
├── components/                       # Reusable UI & Layout Components
│   ├── ui/                           # shadcn/ui components (button, card, badge, etc.)
│   ├── layout/                       # Application shell, sidebar, navbar, page-header
│   ├── applicant/                    # Modular components for applicant flows
│   ├── officer/                      # Modular components for officer flows
│   ├── approval-map/                 # Interactive dependency graph components
│   ├── documents/                    # Document upload & pre-validation viewer
│   ├── ai/                           # AI regulatory assistance widgets
│   ├── notifications/                # Alert bell and toast widgets
│   └── shared/                       # Cross-cutting reusable UI elements
│
├── lib/                              # Business Logic, Utilities, and Services
│   ├── supabase/                     # Client, server, and middleware stubs
│   ├── gemini/                       # AI client stub & regulatory prompts
│   ├── rules/                        # Business rules (approval, eligibility, dependencies)
│   ├── services/                     # Service abstractions (approvals, applications, etc.)
│   ├── validations/                  # Schema definitions & form validators
│   ├── utils.ts                      # CSS class concatenation helper (cn)
│   └── constants.ts                  # Industrial sectors, states, pollution bands
│
├── types/                            # Domain TypeScript Type Definitions
│   ├── database.ts                   # Supabase schema contracts
│   ├── project.ts                    # Industrial project entities
│   ├── approval.ts                   # Clearance & authority contracts
│   ├── application.ts                # Application lifecycle & SLA types
│   ├── document.ts                   # Document validation models
│   ├── inspection.ts                 # Joint inspection models
│   ├── scheme.ts                     # Government policy schemes
│   └── user.ts                       # User roles & profiles
│
├── data/                             # Mock & Static Datasets
│   ├── demo/                         # Identified demo data (projects, approvals, SLAs)
│   └── rules/                        # Master regulatory catalog
│
├── hooks/                            # Custom React Hooks
│   ├── use-project.ts                # Project state hook
│   ├── use-approvals.ts              # Approvals query hook
│   ├── use-applications.ts           # Applications tracking hook
│   └── use-demo-mode.ts              # Demo sandbox mode toggle
│
├── public/                           # Static assets (images, icons)
├── supabase/                         # Database migrations & seed scripts
├── .env.example                      # Template for required environment variables
└── README.md                         # Project documentation
```

---

## 4. How to Install Dependencies

To set up the development environment locally:

```bash
# 1. Clone repository or navigate to workspace directory
cd udyamsetu

# 2. Install required dependencies
npm install
```

---

## 5. How to Run Locally

```bash
# Start the Next.js development server
npm run dev

# Open your browser and navigate to:
http://localhost:3000
```

To run a production verification build:

```bash
# Verify TypeScript types and build production bundles
npm run build

# Start the production build locally
npm run start
```

---

## 6. Current Development Status (Phase 1 Completed)

* [x] **Next.js 16 + TypeScript + App Router** initialized and configured.
* [x] **Tailwind CSS v4 & GovTech Design System** configured with custom tokens (Deep Navy, Slate Neutral, Cyan/Teal accent, SLA warning amber, verified emerald).
* [x] **Complete Directory Architecture** established matching domain requirements.
* [x] **Application Shell (`AppShell`, `TopNavbar`, `AppSidebar`, `PageHeader`)** created with role switcher (Applicant / Officer) and responsive navigation.
* [x] **All Routes & Placeholder Pages** scaffolded and compiling with zero TypeScript errors.
* [x] **Health Check Route (`GET /api/health`)** functional.
* [x] **Strong TypeScript Interfaces** defined for all domain entities.
* [x] **Clearly Identified Demo Data** provided for evaluation.

---

## 7. Planned Modules (Upcoming Steps)

The following capabilities will be implemented incrementally in subsequent phases:
1. **Supabase Integration:** Database tables, migrations, Row Level Security, and authentication.
2. **Dynamic Regulatory Engine:** Sector & pollution category classification rules computing exact statutory clearances.
3. **Interactive Dependency Map:** Visual Directed Acyclic Graph (DAG) of prerequisites using React Flow.
4. **AI Pre-validation Desk:** Server-side Google Gemini integration for document defect analysis.
5. **Officer Review Workflow:** Application status management, SLA countdown timers, and inspection report generator.

---

## 8. Required Environment Variables

When integrating backend services in future steps, copy `.env.example` to `.env.local` and populate:

```env
# Next.js App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API Key (Server-side only)
GEMINI_API_KEY=your-gemini-api-key
```
