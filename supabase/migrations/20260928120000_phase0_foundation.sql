-- Phase 0 foundation.
-- Preserves the original profiles, projects, and applications tables.
-- Does not add later workflow tables and does not insert business, applicant,
-- officer, approval, or application records.
--
-- Row Level Security is enabled with no policies. The anon key cannot read or
-- write these tables until Phase 1 adds policies. public.health_check() does
-- not read them.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'applicant' check (role in ('applicant', 'officer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  sector text not null,
  pollution_category text not null default 'orange' check (pollution_category in ('white', 'green', 'orange', 'red')),
  total_investment_cr numeric(10, 2) not null,
  stage text not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  approval_id text not null,
  status text not null default 'draft',
  submitted_at timestamptz,
  sla_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists applications_project_id_idx on public.applications (project_id);
create index if not exists applications_status_idx on public.applications (status);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;

create or replace function public.health_check()
returns integer
language sql
stable
set search_path = public
as $$
  select 1;
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated, service_role;
