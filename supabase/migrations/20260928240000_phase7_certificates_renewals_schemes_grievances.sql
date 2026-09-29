-- Phase 7: certificates, renewals, schemes, and grievances.
-- Does not insert certificates, renewals, schemes, scheme applications, grievances, or escalation paths.
-- Does not add an approval decision. application_approvals.status stays pending.
-- Certificate issuance refuses until a granted decision exists. That state is not in the schema.
-- Certificate numbers are internal identifiers. No regulatory numbering convention is configured.
-- Certificate files are not generated. Validity periods are not invented.
-- Scheme rows are not copied from demo data. Eligibility rules stay empty until configured.
-- Escalation paths are not seeded. A grievance stays unassigned when no department is chosen.

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'notifications'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%application_submitted%';

  if constraint_name is not null then
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'application_submitted',
    'inspection_scheduled',
    'inspection_reminder',
    'query_raised',
    'query_response_submitted',
    'sla_due_soon',
    'sla_overdue',
    'certificate_issued',
    'renewal_due',
    'renewal_submitted',
    'scheme_application_submitted',
    'grievance_created',
    'grievance_assigned',
    'grievance_escalated',
    'grievance_resolved'
  ));

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  application_approval_id uuid not null references public.application_approvals (id) on delete cascade,
  certificate_number text not null unique,
  certificate_type text not null,
  status text not null check (status in ('issued', 'expired', 'revoked')),
  issued_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  issued_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificates_one_per_approval unique (application_approval_id)
);

create index if not exists certificates_application_id_idx
  on public.certificates (application_id);

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  status text not null check (status in ('due', 'submitted', 'under_review', 'completed', 'expired')),
  renewal_due_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists renewals_one_open
  on public.renewals (certificate_id)
  where status in ('due', 'submitted', 'under_review');

create index if not exists renewals_application_id_idx
  on public.renewals (application_id);

create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  authority text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  eligibility_rules jsonb,
  department_id uuid references public.departments (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheme_applications (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists scheme_applications_one_open
  on public.scheme_applications (project_id, scheme_id)
  where status in ('draft', 'submitted');

create index if not exists scheme_applications_project_id_idx
  on public.scheme_applications (project_id);

create table if not exists public.grievances (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  subject text not null,
  description text not null,
  status text not null check (status in ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  assigned_department_id uuid references public.departments (id),
  assigned_officer_id uuid references public.profiles (id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grievances_created_by_idx
  on public.grievances (created_by, created_at desc);

create index if not exists grievances_department_idx
  on public.grievances (assigned_department_id);

create table if not exists public.grievance_escalation_paths (
  id uuid primary key default gen_random_uuid(),
  from_department_id uuid not null references public.departments (id),
  to_department_id uuid not null references public.departments (id),
  created_at timestamptz not null default now(),
  constraint grievance_escalation_paths_one_from unique (from_department_id),
  constraint grievance_escalation_paths_distinct check (from_department_id <> to_department_id)
);

create table if not exists public.grievance_escalations (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances (id) on delete cascade,
  from_department_id uuid references public.departments (id),
  to_department_id uuid references public.departments (id),
  reason text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists grievance_escalations_grievance_id_idx
  on public.grievance_escalations (grievance_id, created_at);

alter table public.certificates enable row level security;
alter table public.renewals enable row level security;
alter table public.schemes enable row level security;
alter table public.scheme_applications enable row level security;
alter table public.grievances enable row level security;
alter table public.grievance_escalation_paths enable row level security;
alter table public.grievance_escalations enable row level security;

revoke all on public.certificates from public, anon, authenticated;
revoke all on public.renewals from public, anon, authenticated;
revoke all on public.schemes from public, anon, authenticated;
revoke all on public.scheme_applications from public, anon, authenticated;
revoke all on public.grievances from public, anon, authenticated;
revoke all on public.grievance_escalation_paths from public, anon, authenticated;
revoke all on public.grievance_escalations from public, anon, authenticated;

grant select on public.certificates to authenticated;
grant select on public.renewals to authenticated;
grant select on public.schemes to authenticated;
grant select on public.scheme_applications to authenticated;
grant select on public.grievances to authenticated;
grant select on public.grievance_escalation_paths to authenticated;
grant select on public.grievance_escalations to authenticated;

drop policy if exists certificates_select_participant on public.certificates;
create policy certificates_select_participant on public.certificates
  for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id = application_id
        and p.user_id = auth.uid()
    )
    or (
      public.current_user_role() in ('officer', 'admin')
      and exists (
        select 1
        from public.application_department_workflows w
        join public.officer_departments od on od.department_id = w.department_id
        where w.application_approval_id = certificates.application_approval_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists renewals_select_participant on public.renewals;
create policy renewals_select_participant on public.renewals
  for select to authenticated
  using (
    exists (
      select 1
      from public.certificates c
      join public.applications a on a.id = c.application_id
      join public.projects p on p.id = a.project_id
      where c.id = certificate_id
        and p.user_id = auth.uid()
    )
    or (
      public.current_user_role() in ('officer', 'admin')
      and exists (
        select 1
        from public.certificates c
        join public.application_department_workflows w
          on w.application_approval_id = c.application_approval_id
        join public.officer_departments od on od.department_id = w.department_id
        where c.id = certificate_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists schemes_select_active on public.schemes;
create policy schemes_select_active on public.schemes
  for select to authenticated
  using (status = 'active');

drop policy if exists scheme_applications_select_participant on public.scheme_applications;
create policy scheme_applications_select_participant on public.scheme_applications
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
    or (
      public.current_user_role() in ('officer', 'admin')
      and exists (
        select 1
        from public.schemes s
        join public.officer_departments od on od.department_id = s.department_id
        where s.id = scheme_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists grievances_select_participant on public.grievances;
create policy grievances_select_participant on public.grievances
  for select to authenticated
  using (
    created_by = auth.uid()
    or (
      public.current_user_role() in ('officer', 'admin')
      and assigned_department_id is not null
      and exists (
        select 1
        from public.officer_departments od
        where od.department_id = assigned_department_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists grievance_escalation_paths_select_officer on public.grievance_escalation_paths;
create policy grievance_escalation_paths_select_officer on public.grievance_escalation_paths
  for select to authenticated
  using (public.current_user_role() in ('officer', 'admin'));

drop policy if exists grievance_escalations_select_participant on public.grievance_escalations;
create policy grievance_escalations_select_participant on public.grievance_escalations
  for select to authenticated
  using (
    exists (
      select 1
      from public.grievances g
      where g.id = grievance_id
        and (
          g.created_by = auth.uid()
          or (
            public.current_user_role() in ('officer', 'admin')
            and g.assigned_department_id is not null
            and exists (
              select 1
              from public.officer_departments od
              where od.department_id = g.assigned_department_id
                and od.user_id = auth.uid()
            )
          )
        )
    )
  );

create or replace function public.scheme_eligibility(target_project uuid, rules jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  project_pollution text;
  project_land text;
  project_sector text;
  project_stage text;
  rule_key text;
  rule_values jsonb;
  actual text;
  missing boolean := false;
  mismatch boolean := false;
begin
  select pollution_category, land_classification, sector, stage
    into project_pollution, project_land, project_sector, project_stage
  from public.projects
  where id = target_project;

  if rules is null or rules = '{}'::jsonb or jsonb_typeof(rules) is distinct from 'object' then
    return 'insufficient_data';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(rules) as keys(rule_key)
    where keys.rule_key not in ('pollutionCategory', 'landClassification', 'sector', 'stage')
  ) then
    return 'insufficient_data';
  end if;

  for rule_key, rule_values in
    select key, value from jsonb_each(rules)
  loop
    if jsonb_typeof(rule_values) is distinct from 'array' or jsonb_array_length(rule_values) = 0 then
      missing := true;
      continue;
    end if;

    actual := case rule_key
      when 'pollutionCategory' then nullif(btrim(project_pollution), '')
      when 'landClassification' then nullif(btrim(project_land), '')
      when 'sector' then nullif(btrim(project_sector), '')
      when 'stage' then nullif(btrim(project_stage), '')
      else null
    end;

    if actual is null then
      missing := true;
    elsif not (rule_values @> to_jsonb(actual)) then
      mismatch := true;
    end if;
  end loop;

  if missing then
    return 'insufficient_data';
  end if;
  if mismatch then
    return 'not_eligible';
  end if;
  return 'eligible';
end;
$$;

create or replace function public.issue_approval_certificate(target_approval uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  approval_status text;
  approval_application uuid;
  approval_code text;
  workflow_department uuid;
  applicant uuid;
  certificate_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'certificate was not issued';
  end if;

  select aa.status, aa.application_id
    into approval_status, approval_application
  from public.application_approvals aa
  where aa.id = target_approval
  for update;

  if approval_application is null then
    raise exception 'certificate was not issued';
  end if;

  select t.code, w.department_id, p.user_id
    into approval_code, workflow_department, applicant
  from public.application_approvals aa
  join public.approval_types t on t.id = aa.approval_type_id
  join public.applications a on a.id = aa.application_id
  join public.projects p on p.id = a.project_id
  left join public.application_department_workflows w on w.application_approval_id = aa.id
  where aa.id = target_approval;

  if workflow_department is null or not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = workflow_department
  ) then
    raise exception 'certificate was not issued';
  end if;

  -- pending is the only stored approval status. granted is not a legal status yet.
  if approval_status is distinct from 'granted' then
    raise exception 'approval decision required';
  end if;

  insert into public.certificates (
    application_id,
    application_approval_id,
    certificate_number,
    certificate_type,
    status,
    issued_at,
    valid_from,
    valid_until,
    issued_by
  ) values (
    approval_application,
    target_approval,
    'internal-' || gen_random_uuid()::text,
    approval_code,
    'issued',
    now(),
    null,
    null,
    auth.uid()
  )
  returning id into certificate_id;

  perform public.enqueue_notification(
    applicant,
    approval_application,
    null,
    certificate_id,
    'certificate_issued',
    'Approval Update',
    'Certificate recorded',
    'A certificate was recorded. No validity period is configured, and no document file was generated.'
  );

  return certificate_id;
exception
  when unique_violation then
    raise exception 'certificate already issued';
end;
$$;

create or replace function public.create_certificate_renewal(target_certificate uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  certificate_application uuid;
  certificate_status text;
  certificate_valid timestamptz;
  owner uuid;
  renewal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'renewal was not created';
  end if;

  select c.application_id, c.status, c.valid_until, p.user_id
    into certificate_application, certificate_status, certificate_valid, owner
  from public.certificates c
  join public.applications a on a.id = c.application_id
  join public.projects p on p.id = a.project_id
  where c.id = target_certificate
  for update of c;

  if owner is null or owner is distinct from auth.uid() or certificate_status is distinct from 'issued' then
    raise exception 'renewal was not created';
  end if;

  if certificate_valid is null then
    raise exception 'renewal is not configured';
  end if;

  if exists (
    select 1
    from public.renewals r
    where r.certificate_id = target_certificate
      and r.status in ('due', 'submitted', 'under_review')
  ) then
    raise exception 'renewal already open';
  end if;

  insert into public.renewals (
    certificate_id,
    application_id,
    status,
    renewal_due_at
  ) values (
    target_certificate,
    certificate_application,
    'due',
    certificate_valid
  )
  returning id into renewal_id;

  return renewal_id;
end;
$$;

create or replace function public.submit_certificate_renewal(target_renewal uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  renewal_status text;
  renewal_application uuid;
  certificate_valid timestamptz;
  workflow_department uuid;
  owner uuid;
  officer_record record;
begin
  if auth.uid() is null then
    raise exception 'renewal was not submitted';
  end if;

  select r.status, r.application_id, c.valid_until, p.user_id, w.department_id
    into renewal_status, renewal_application, certificate_valid, owner, workflow_department
  from public.renewals r
  join public.certificates c on c.id = r.certificate_id
  join public.applications a on a.id = c.application_id
  join public.projects p on p.id = a.project_id
  left join public.application_department_workflows w on w.application_approval_id = c.application_approval_id
  where r.id = target_renewal
  for update of r;

  if owner is null or owner is distinct from auth.uid() or renewal_status is distinct from 'due' then
    raise exception 'renewal was not submitted';
  end if;

  if certificate_valid is null then
    raise exception 'renewal is not configured';
  end if;

  update public.renewals
  set status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  where id = target_renewal
    and status = 'due';

  perform public.enqueue_notification(
    owner,
    renewal_application,
    null,
    target_renewal,
    'renewal_submitted',
    'Deadline',
    'Renewal submitted',
    'The renewal was submitted. It is not completed.'
  );

  if workflow_department is not null then
    for officer_record in
      select od.user_id
      from public.officer_departments od
      where od.department_id = workflow_department
    loop
      perform public.enqueue_notification(
        officer_record.user_id,
        renewal_application,
        null,
        target_renewal,
        'renewal_submitted',
        'Deadline',
        'Renewal submitted',
        'An applicant submitted a renewal. It is not completed.'
      );
    end loop;
  end if;

  return target_renewal;
end;
$$;

create or replace function public.submit_scheme_application(target_scheme uuid, target_project uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  scheme_status text;
  scheme_rules jsonb;
  owner uuid;
  outcome text;
  application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'scheme application was not submitted';
  end if;

  select p.user_id
    into owner
  from public.projects p
  where p.id = target_project
  for update;

  if owner is null or owner is distinct from auth.uid() then
    raise exception 'scheme application was not submitted';
  end if;

  select s.status, s.eligibility_rules
    into scheme_status, scheme_rules
  from public.schemes s
  where s.id = target_scheme
    and s.status = 'active';

  if scheme_status is null then
    raise exception 'scheme application was not submitted';
  end if;

  if exists (
    select 1
    from public.scheme_applications sa
    where sa.project_id = target_project
      and sa.scheme_id = target_scheme
      and sa.status in ('draft', 'submitted')
  ) then
    raise exception 'scheme application already submitted';
  end if;

  outcome := public.scheme_eligibility(target_project, scheme_rules);
  if outcome = 'insufficient_data' then
    raise exception 'scheme eligibility is insufficient';
  end if;
  if outcome is distinct from 'eligible' then
    raise exception 'scheme application was not submitted';
  end if;

  insert into public.scheme_applications (
    scheme_id,
    project_id,
    status,
    submitted_at,
    created_by
  ) values (
    target_scheme,
    target_project,
    'submitted',
    now(),
    auth.uid()
  )
  returning id into application_id;

  perform public.enqueue_notification(
    auth.uid(),
    null,
    null,
    application_id,
    'scheme_application_submitted',
    'Scheme',
    'Scheme claim submitted',
    'The scheme claim was submitted. It is not approved.'
  );

  return application_id;
exception
  when unique_violation then
    raise exception 'scheme application already submitted';
end;
$$;

create or replace function public.create_grievance(
  target_application uuid,
  target_department uuid,
  grievance_subject text,
  grievance_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  project_id uuid;
  grievance_id uuid;
  officer_record record;
begin
  if auth.uid() is null then
    raise exception 'grievance was not created';
  end if;

  if grievance_subject is null
    or char_length(btrim(grievance_subject)) = 0
    or char_length(grievance_subject) > 200
    or grievance_body is null
    or char_length(btrim(grievance_body)) = 0
    or char_length(grievance_body) > 4000
  then
    raise exception 'invalid grievance';
  end if;

  if target_application is not null then
    select p.user_id, a.project_id
      into owner, project_id
    from public.applications a
    join public.projects p on p.id = a.project_id
    where a.id = target_application;

    if owner is null or owner is distinct from auth.uid() then
      raise exception 'grievance was not created';
    end if;
  end if;

  if target_department is not null and not exists (
    select 1 from public.departments d where d.id = target_department
  ) then
    raise exception 'invalid grievance';
  end if;

  insert into public.grievances (
    application_id,
    project_id,
    created_by,
    subject,
    description,
    status,
    assigned_department_id
  ) values (
    target_application,
    project_id,
    auth.uid(),
    btrim(grievance_subject),
    btrim(grievance_body),
    'open',
    target_department
  )
  returning id into grievance_id;

  perform public.enqueue_notification(
    auth.uid(),
    target_application,
    null,
    grievance_id,
    'grievance_created',
    'Action Required',
    'Grievance recorded',
    'The grievance was recorded. It is not resolved.'
  );

  if target_department is not null then
    for officer_record in
      select od.user_id
      from public.officer_departments od
      where od.department_id = target_department
        and od.user_id is distinct from auth.uid()
    loop
      perform public.enqueue_notification(
        officer_record.user_id,
        target_application,
        null,
        grievance_id,
        'grievance_created',
        'Action Required',
        'Grievance recorded',
        'A grievance was recorded for your department. It is not resolved.'
      );
    end loop;
  end if;

  return grievance_id;
end;
$$;

create or replace function public.assign_grievance(target_grievance uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  grievance_status text;
  grievance_department uuid;
  applicant uuid;
  grievance_application uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'grievance was not updated';
  end if;

  select g.status, g.assigned_department_id, g.created_by, g.application_id
    into grievance_status, grievance_department, applicant, grievance_application
  from public.grievances g
  where g.id = target_grievance
  for update;

  if grievance_status is null or grievance_status is distinct from 'open' or grievance_department is null then
    raise exception 'grievance was not updated';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = grievance_department
  ) then
    raise exception 'grievance was not updated';
  end if;

  update public.grievances
  set status = 'assigned',
      assigned_officer_id = auth.uid(),
      updated_at = now()
  where id = target_grievance
    and status = 'open';

  perform public.enqueue_notification(
    applicant,
    grievance_application,
    null,
    target_grievance,
    'grievance_assigned',
    'Action Required',
    'Grievance assigned',
    'A department officer was assigned to the grievance.'
  );

  return target_grievance;
end;
$$;

create or replace function public.resolve_grievance(target_grievance uuid, note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  grievance_status text;
  grievance_department uuid;
  assignee uuid;
  applicant uuid;
  grievance_application uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'grievance was not updated';
  end if;

  if note is null or char_length(btrim(note)) = 0 or char_length(note) > 4000 then
    raise exception 'invalid grievance';
  end if;

  select g.status, g.assigned_department_id, g.assigned_officer_id, g.created_by, g.application_id
    into grievance_status, grievance_department, assignee, applicant, grievance_application
  from public.grievances g
  where g.id = target_grievance
  for update;

  if grievance_status is null
    or grievance_status not in ('open', 'assigned', 'in_progress')
    or grievance_department is null
  then
    raise exception 'grievance was not updated';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = grievance_department
  ) then
    raise exception 'grievance was not updated';
  end if;

  if assignee is not null
    and assignee is distinct from auth.uid()
    and public.current_user_role() is distinct from 'admin'
  then
    raise exception 'grievance was not updated';
  end if;

  update public.grievances
  set status = 'resolved',
      resolution_note = btrim(note),
      resolved_at = now(),
      updated_at = now()
  where id = target_grievance
    and status in ('open', 'assigned', 'in_progress');

  perform public.enqueue_notification(
    applicant,
    grievance_application,
    null,
    target_grievance,
    'grievance_resolved',
    'Action Required',
    'Grievance resolved',
    'The department recorded a resolution.'
  );

  return target_grievance;
end;
$$;

create or replace function public.escalate_grievance(target_grievance uuid, escalation_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  grievance_status text;
  grievance_department uuid;
  applicant uuid;
  grievance_application uuid;
  destination uuid;
  escalation_id uuid;
  officer_record record;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'grievance was not updated';
  end if;

  if escalation_reason is null
    or char_length(btrim(escalation_reason)) = 0
    or char_length(escalation_reason) > 1000
  then
    raise exception 'invalid grievance';
  end if;

  select g.status, g.assigned_department_id, g.created_by, g.application_id
    into grievance_status, grievance_department, applicant, grievance_application
  from public.grievances g
  where g.id = target_grievance
  for update;

  if grievance_status is null
    or grievance_status not in ('open', 'assigned', 'in_progress')
    or grievance_department is null
  then
    raise exception 'grievance was not updated';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = grievance_department
  ) then
    raise exception 'grievance was not updated';
  end if;

  select path.to_department_id
    into destination
  from public.grievance_escalation_paths path
  where path.from_department_id = grievance_department;

  if destination is null then
    raise exception 'escalation path is not configured';
  end if;

  insert into public.grievance_escalations (
    grievance_id,
    from_department_id,
    to_department_id,
    reason,
    created_by
  ) values (
    target_grievance,
    grievance_department,
    destination,
    btrim(escalation_reason),
    auth.uid()
  )
  returning id into escalation_id;

  update public.grievances
  set assigned_department_id = destination,
      assigned_officer_id = null,
      status = 'open',
      updated_at = now()
  where id = target_grievance;

  perform public.enqueue_notification(
    applicant,
    grievance_application,
    null,
    escalation_id,
    'grievance_escalated',
    'Action Required',
    'Grievance escalated',
    'The grievance was moved to the configured department. It is not resolved.'
  );

  for officer_record in
    select od.user_id
    from public.officer_departments od
    where od.department_id = destination
      and od.user_id is distinct from auth.uid()
  loop
    perform public.enqueue_notification(
      officer_record.user_id,
      grievance_application,
      null,
      escalation_id,
      'grievance_escalated',
      'Action Required',
      'Grievance escalated',
      'A grievance was escalated to your department. It is not resolved.'
    );
  end loop;

  return escalation_id;
end;
$$;

-- Renewal reminders run only from the scheduler entry point.
-- A null renewal_due_at never produces a reminder. Page loads do not call this.
create or replace function public.evaluate_renewal_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  renewal_record record;
  officer_record record;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'renewals were not evaluated';
  end if;

  for renewal_record in
    select r.id, r.application_id, p.user_id as applicant, w.department_id
    from public.renewals r
    join public.certificates c on c.id = r.certificate_id
    join public.applications a on a.id = c.application_id
    join public.projects p on p.id = a.project_id
    left join public.application_department_workflows w
      on w.application_approval_id = c.application_approval_id
    where r.status = 'due'
      and r.renewal_due_at is not null
      and r.renewal_due_at <= now()
  loop
    perform public.enqueue_notification(
      renewal_record.applicant,
      renewal_record.application_id,
      null,
      renewal_record.id,
      'renewal_due',
      'Deadline',
      'Renewal due',
      'A recorded certificate validity date has been reached. This is not a statutory period.'
    );

    if renewal_record.department_id is not null then
      for officer_record in
        select od.user_id
        from public.officer_departments od
        where od.department_id = renewal_record.department_id
      loop
        perform public.enqueue_notification(
          officer_record.user_id,
          renewal_record.application_id,
          null,
          renewal_record.id,
          'renewal_due',
          'Deadline',
          'Renewal due',
          'A recorded certificate validity date has been reached.'
        );
      end loop;
    end if;
  end loop;

  return 0;
end;
$$;

revoke all on function public.scheme_eligibility(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.issue_approval_certificate(uuid) from public, anon;
revoke all on function public.create_certificate_renewal(uuid) from public, anon;
revoke all on function public.submit_certificate_renewal(uuid) from public, anon;
revoke all on function public.submit_scheme_application(uuid, uuid) from public, anon;
revoke all on function public.create_grievance(uuid, uuid, text, text) from public, anon;
revoke all on function public.assign_grievance(uuid) from public, anon;
revoke all on function public.resolve_grievance(uuid, text) from public, anon;
revoke all on function public.escalate_grievance(uuid, text) from public, anon;
revoke all on function public.evaluate_renewal_notifications() from public, anon;

grant execute on function public.issue_approval_certificate(uuid) to authenticated;
grant execute on function public.create_certificate_renewal(uuid) to authenticated;
grant execute on function public.submit_certificate_renewal(uuid) to authenticated;
grant execute on function public.submit_scheme_application(uuid, uuid) to authenticated;
grant execute on function public.create_grievance(uuid, uuid, text, text) to authenticated;
grant execute on function public.assign_grievance(uuid) to authenticated;
grant execute on function public.resolve_grievance(uuid, text) to authenticated;
grant execute on function public.escalate_grievance(uuid, text) to authenticated;
grant execute on function public.evaluate_renewal_notifications() to authenticated;
