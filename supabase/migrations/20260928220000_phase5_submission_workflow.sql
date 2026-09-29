-- Phase 5: application submission, department workflows, and queries.
-- Does not insert users, projects, applications, approvals, documents, officers, or queries.
-- Department codes come from approval_types.department. Null departments are not invented.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.departments (code, name)
select distinct t.department, t.department
from public.approval_types t
where t.department is not null
on conflict (code) do nothing;

update public.departments
set name = case code
  when 'MIDC' then 'Maharashtra Industrial Development Corporation'
  when 'MPCB' then 'Maharashtra Pollution Control Board'
  when 'FIRE_SERVICES' then 'Maharashtra Fire Services Directorate'
  when 'DISH' then 'Directorate of Industrial Safety and Health'
  else name
end
where code in ('MIDC', 'MPCB', 'FIRE_SERVICES', 'DISH');

-- Provision an officer only from the SQL editor or service role, after the
-- profile role is already officer or admin. Signup cannot create this row.
--   insert into public.officer_departments (user_id, department_id)
--   select p.id, d.id
--   from public.profiles p
--   join public.departments d on d.code = 'MPCB'
--   where p.email = 'person@example.com' and p.role in ('officer', 'admin');

create table if not exists public.officer_departments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  department_id uuid not null references public.departments (id),
  created_at timestamptz not null default now(),
  primary key (user_id, department_id)
);

create table if not exists public.application_department_workflows (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  application_approval_id uuid not null references public.application_approvals (id) on delete cascade,
  department_id uuid not null references public.departments (id),
  status text not null default 'submitted' check (status in ('submitted')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_department_workflows_approval_unique unique (application_approval_id)
);

create table if not exists public.application_queries (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  department_workflow_id uuid not null references public.application_department_workflows (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'responded', 'resolved')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_query_responses (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null unique references public.application_queries (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists officer_departments_department_id_idx
  on public.officer_departments (department_id);
create index if not exists application_department_workflows_application_id_idx
  on public.application_department_workflows (application_id);
create index if not exists application_department_workflows_department_id_idx
  on public.application_department_workflows (department_id);
create index if not exists application_queries_application_id_idx
  on public.application_queries (application_id);
create index if not exists application_queries_workflow_id_idx
  on public.application_queries (department_workflow_id);

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'draft',
    'submitted',
    'under_review',
    'query_raised',
    'query_response_submitted'
  ));

create or replace function public.protect_application_workflow_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft'
      or new.submitted_at is not null
      or new.sla_deadline is not null
    then
      if current_setting('udyamsetu.application_transition', true) is distinct from 'allowed' then
        raise exception 'application workflow cannot be changed directly';
      end if;
    end if;
    return new;
  end if;

  if new.project_id is distinct from old.project_id
    or new.status is distinct from old.status
    or new.submitted_at is distinct from old.submitted_at
    or new.sla_deadline is distinct from old.sla_deadline
  then
    if current_setting('udyamsetu.application_transition', true) is distinct from 'allowed' then
      raise exception 'application workflow cannot be changed directly';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_application_workflow on public.applications;
create trigger protect_application_workflow
  before insert or update on public.applications
  for each row execute function public.protect_application_workflow_columns();

alter table public.departments enable row level security;
alter table public.officer_departments enable row level security;
alter table public.application_department_workflows enable row level security;
alter table public.application_queries enable row level security;
alter table public.application_query_responses enable row level security;

revoke all on public.departments from public, anon, authenticated;
revoke all on public.officer_departments from public, anon, authenticated;
revoke all on public.application_department_workflows from public, anon, authenticated;
revoke all on public.application_queries from public, anon, authenticated;
revoke all on public.application_query_responses from public, anon, authenticated;

grant select on public.departments to authenticated;
grant select on public.officer_departments to authenticated;
grant select on public.application_department_workflows to authenticated;
grant select on public.application_queries to authenticated;
grant select on public.application_query_responses to authenticated;

drop policy if exists departments_select_catalog on public.departments;
create policy departments_select_catalog on public.departments
  for select to authenticated
  using (true);

drop policy if exists officer_departments_select_own on public.officer_departments;
create policy officer_departments_select_own on public.officer_departments
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists workflows_select_participant on public.application_department_workflows;
create policy workflows_select_participant on public.application_department_workflows
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
        from public.officer_departments od
        where od.user_id = auth.uid()
          and od.department_id = application_department_workflows.department_id
      )
    )
  );

drop policy if exists queries_select_participant on public.application_queries;
create policy queries_select_participant on public.application_queries
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
        where w.id = department_workflow_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists query_responses_select_participant on public.application_query_responses;
create policy query_responses_select_participant on public.application_query_responses
  for select to authenticated
  using (
    exists (
      select 1
      from public.application_queries q
      join public.applications a on a.id = q.application_id
      join public.projects p on p.id = a.project_id
      where q.id = query_id
        and p.user_id = auth.uid()
    )
    or (
      public.current_user_role() in ('officer', 'admin')
      and exists (
        select 1
        from public.application_queries q
        join public.application_department_workflows w on w.id = q.department_workflow_id
        join public.officer_departments od on od.department_id = w.department_id
        where q.id = query_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists applications_select_department on public.applications;
create policy applications_select_department on public.applications
  for select to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id = applications.id
        and od.user_id = auth.uid()
    )
  );

drop policy if exists projects_select_department on public.projects;
create policy projects_select_department on public.projects
  for select to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.applications a
      join public.application_department_workflows w on w.application_id = a.id
      join public.officer_departments od on od.department_id = w.department_id
      where a.project_id = projects.id
        and od.user_id = auth.uid()
    )
  );

drop policy if exists application_approvals_select_department on public.application_approvals;
create policy application_approvals_select_department on public.application_approvals
  for select to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id = application_approvals.application_id
        and od.user_id = auth.uid()
    )
  );

drop policy if exists documents_select_department on public.documents;
create policy documents_select_department on public.documents
  for select to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id = documents.application_id
        and od.user_id = auth.uid()
    )
  );

drop policy if exists profiles_select_department_applicant on public.profiles;
create policy profiles_select_department_applicant on public.profiles
  for select to authenticated
  using (
    public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.projects p
      join public.applications a on a.project_id = p.id
      join public.application_department_workflows w on w.application_id = a.id
      join public.officer_departments od on od.department_id = w.department_id
      where p.user_id = profiles.id
        and od.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_select_department on storage.objects;
create policy application_documents_select_department on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = 'application'
    and public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id::text = (storage.foldername(name))[2]
        and od.user_id = auth.uid()
    )
  );

-- One transaction: workflows for catalog departments, then application submitted.
-- Approval rows stay pending. A missing checklist or a second submit does not
-- leave a submitted application without its workflows.
create or replace function public.submit_application(target_application uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  current_status text;
  approval_count integer;
  workflow_count integer;
begin
  if auth.uid() is null or target_application is null then
    raise exception 'application was not submitted';
  end if;

  select p.user_id, a.status
    into owner, current_status
  from public.applications a
  join public.projects p on p.id = a.project_id
  where a.id = target_application
  for update of a;

  if owner is distinct from auth.uid() then
    raise exception 'application was not submitted';
  end if;

  if current_status is distinct from 'draft' then
    raise exception 'application is not a draft';
  end if;

  select count(*) into approval_count
  from public.application_approvals
  where application_id = target_application;

  if approval_count = 0 then
    raise exception 'approval checklist missing';
  end if;

  if not exists (
    select 1
    from public.application_approvals aa
    join public.approval_types t on t.id = aa.approval_type_id
    join public.departments d on d.code = t.department
    where aa.application_id = target_application
      and t.department is not null
  ) then
    raise exception 'department not recorded';
  end if;

  insert into public.application_department_workflows (
    application_id,
    application_approval_id,
    department_id,
    status
  )
  select
    target_application,
    aa.id,
    d.id,
    'submitted'
  from public.application_approvals aa
  join public.approval_types t on t.id = aa.approval_type_id
  join public.departments d on d.code = t.department
  where aa.application_id = target_application
    and t.department is not null
  on conflict (application_approval_id) do nothing;

  get diagnostics workflow_count = row_count;
  if workflow_count = 0 then
    raise exception 'application was not submitted';
  end if;

  perform set_config('udyamsetu.application_transition', 'allowed', true);

  update public.applications
  set status = 'submitted',
      submitted_at = now()
  where id = target_application
    and status = 'draft';

  if not found then
    raise exception 'application was not submitted';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'submitted',
    'workflows', workflow_count
  );
end;
$$;

create or replace function public.raise_department_query(
  target_workflow uuid,
  question text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_application uuid;
  workflow_department uuid;
  application_status text;
  query_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'query was not created';
  end if;

  if question is null or char_length(btrim(question)) = 0 or char_length(question) > 4000 then
    raise exception 'invalid query';
  end if;

  select w.application_id, w.department_id, a.status
    into workflow_application, workflow_department, application_status
  from public.application_department_workflows w
  join public.applications a on a.id = w.application_id
  where w.id = target_workflow
  for update of a;

  if workflow_application is null then
    raise exception 'query was not created';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = workflow_department
  ) then
    raise exception 'query was not created';
  end if;

  if application_status not in (
    'submitted',
    'under_review',
    'query_raised',
    'query_response_submitted'
  ) then
    raise exception 'query was not created';
  end if;

  insert into public.application_queries (
    application_id,
    department_workflow_id,
    body,
    status,
    created_by
  ) values (
    workflow_application,
    target_workflow,
    btrim(question),
    'open',
    auth.uid()
  )
  returning id into query_id;

  perform set_config('udyamsetu.application_transition', 'allowed', true);

  update public.applications
  set status = 'query_raised'
  where id = workflow_application;

  return query_id;
end;
$$;

create or replace function public.respond_to_query(
  target_query uuid,
  answer text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  query_status text;
  query_application uuid;
  response_id uuid;
  open_count integer;
begin
  if auth.uid() is null or target_query is null then
    raise exception 'response was not recorded';
  end if;

  if answer is null or char_length(btrim(answer)) = 0 or char_length(answer) > 4000 then
    raise exception 'invalid response';
  end if;

  select p.user_id, q.status, q.application_id
    into owner, query_status, query_application
  from public.application_queries q
  join public.applications a on a.id = q.application_id
  join public.projects p on p.id = a.project_id
  where q.id = target_query
  for update of q, a;

  if owner is distinct from auth.uid() then
    raise exception 'response was not recorded';
  end if;

  if query_status is distinct from 'open' then
    raise exception 'query was not open';
  end if;

  insert into public.application_query_responses (
    query_id,
    body,
    created_by
  ) values (
    target_query,
    btrim(answer),
    auth.uid()
  )
  returning id into response_id;

  update public.application_queries
  set status = 'responded',
      updated_at = now()
  where id = target_query
    and status = 'open';

  select count(*) into open_count
  from public.application_queries
  where application_id = query_application
    and status = 'open';

  perform set_config('udyamsetu.application_transition', 'allowed', true);

  if open_count = 0 then
    update public.applications
    set status = 'query_response_submitted'
    where id = query_application;
  end if;

  return response_id;
end;
$$;

revoke all on function public.protect_application_workflow_columns() from public, anon, authenticated;
revoke all on function public.submit_application(uuid) from public, anon;
revoke all on function public.raise_department_query(uuid, text) from public, anon;
revoke all on function public.respond_to_query(uuid, text) from public, anon;
grant execute on function public.submit_application(uuid) to authenticated;
grant execute on function public.raise_department_query(uuid, text) to authenticated;
grant execute on function public.respond_to_query(uuid, text) to authenticated;
