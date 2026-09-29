-- Phase 1D-B: approval catalog and application approval instances.
-- Catalog rows are the codes determineRequiredApprovals already returns.
-- This does not insert applications, projects, or application approval instances.

create table if not exists public.approval_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department text,
  description text,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_approvals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  approval_type_id uuid not null references public.approval_types (id),
  status text not null default 'pending',
  sort_order integer not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_approvals_status_check check (status in ('pending')),
  constraint application_approvals_unique_type unique (application_id, approval_type_id)
);

create index if not exists application_approvals_application_id_idx
  on public.application_approvals (application_id);
create index if not exists application_approvals_approval_type_id_idx
  on public.application_approvals (approval_type_id);

insert into public.approval_types (code, name, department, description, category)
values
  (
    'MIDC_LAND_ALLOTMENT',
    'MIDC Land Allotment & Lease Possession',
    'MIDC',
    'Statutory land allotment and possession order for industrial plots.',
    'Land & Building'
  ),
  (
    'NA_LAND_CONVERSION',
    'NA_LAND_CONVERSION',
    null,
    'Required by the existing approval rule when land is not an industrial estate.',
    'Land & Building'
  ),
  (
    'PCB_CTE',
    'Consent to Establish (CTE)',
    'MPCB',
    'Statutory environmental clearance prior to construction of industrial facility.',
    'Environment & Pollution'
  ),
  (
    'PCB_CTO',
    'PCB_CTO',
    'MPCB',
    'Required by the existing approval rule for red and orange pollution categories.',
    'Environment & Pollution'
  ),
  (
    'PCB_GREEN_CONSENT',
    'PCB_GREEN_CONSENT',
    'MPCB',
    'Required by the existing approval rule for the green pollution category.',
    'Environment & Pollution'
  ),
  (
    'FIRE_NOC',
    'Provisional Fire Safety NOC',
    'FIRE_SERVICES',
    'Fire protection system design approval and egress plan clearance.',
    'Safety & Fire'
  ),
  (
    'FACTORY_PLAN_DISH',
    'Factory Building Plan Approval',
    'DISH',
    'Factory safety, worker welfare amenities, ventilation, and machinery layout approval.',
    'Safety & Fire'
  ),
  (
    'POWER_FEASIBILITY',
    'POWER_FEASIBILITY',
    null,
    'Required by the existing approval rule for every project with complete approval inputs.',
    'Utilities & Power'
  )
on conflict (code) do nothing;

alter table public.approval_types enable row level security;
alter table public.application_approvals enable row level security;

revoke all on public.approval_types from public, anon, authenticated;
revoke all on public.application_approvals from public, anon, authenticated;
grant select on public.approval_types to authenticated;
grant select on public.application_approvals to authenticated;

drop policy if exists approval_types_select_catalog on public.approval_types;
create policy approval_types_select_catalog on public.approval_types
  for select to authenticated
  using (true);

drop policy if exists application_approvals_select_own on public.application_approvals;
create policy application_approvals_select_own on public.application_approvals
  for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id = application_id
        and p.user_id = auth.uid()
    )
  );

-- Applicants cannot insert approval rows directly. Generation runs in this
-- function, which recomputes the existing rule and ignores any client code list.
create or replace function public.generate_application_approvals(target_application uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  land text;
  pollution text;
  codes text[] := array[]::text[];
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select p.user_id, p.land_classification, p.pollution_category
    into owner, land, pollution
  from public.applications a
  join public.projects p on p.id = a.project_id
  where a.id = target_application;

  if owner is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if land is null or land not in (
    'industrial_estate',
    'private_agricultural',
    'private_non_agricultural',
    'sez'
  ) or pollution is null or pollution not in ('white', 'green', 'orange', 'red') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_PROJECT_INFORMATION'
    );
  end if;

  if land = 'industrial_estate' then
    codes := codes || 'MIDC_LAND_ALLOTMENT';
  else
    codes := codes || 'NA_LAND_CONVERSION';
  end if;

  if pollution in ('red', 'orange') then
    codes := codes || array['PCB_CTE', 'PCB_CTO'];
  elsif pollution = 'green' then
    codes := codes || 'PCB_GREEN_CONSENT';
  end if;

  codes := codes || array['FIRE_NOC', 'FACTORY_PLAN_DISH', 'POWER_FEASIBILITY'];

  if (
    select count(*)
    from unnest(codes) as required(code)
    join public.approval_types t on t.code = required.code
  ) <> coalesce(array_length(codes, 1), 0) then
    raise exception 'unknown approval code';
  end if;

  insert into public.application_approvals (
    application_id,
    approval_type_id,
    status,
    sort_order,
    required
  )
  select
    target_application,
    t.id,
    'pending',
    required.ordinality::integer,
    true
  from unnest(codes) with ordinality as required(code, ordinality)
  join public.approval_types t on t.code = required.code
  on conflict (application_id, approval_type_id) do nothing;

  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'codes', to_jsonb(codes),
    'inserted', inserted_count
  );
end;
$$;

revoke all on function public.generate_application_approvals(uuid) from public, anon;
grant execute on function public.generate_application_approvals(uuid) to authenticated;
