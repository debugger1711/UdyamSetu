-- Phase 6: inspections, nullable SLA timestamps, and notifications.
-- Does not insert applications, inspections, reports, notifications, or SLA durations.
-- approval_types.sla_duration_hours stays null. No statutory duration is invented.

alter table public.approval_types
  add column if not exists sla_duration_hours integer;

alter table public.approval_types
  drop constraint if exists approval_types_sla_duration_hours_check;

alter table public.approval_types
  add constraint approval_types_sla_duration_hours_check
  check (sla_duration_hours is null or sla_duration_hours > 0);

alter table public.application_department_workflows
  add column if not exists sla_started_at timestamptz,
  add column if not exists sla_deadline timestamptz,
  add column if not exists sla_completed_at timestamptz;

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  department_workflow_id uuid not null references public.application_department_workflows (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null check (status in ('scheduled', 'assigned', 'completed', 'cancelled')),
  assigned_officer_id uuid references public.profiles (id),
  location text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inspections_one_active_per_workflow
  on public.inspections (department_workflow_id)
  where status in ('scheduled', 'assigned');

create index if not exists inspections_application_id_idx
  on public.inspections (application_id);

create table if not exists public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null unique references public.inspections (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  department_workflow_id uuid references public.application_department_workflows (id) on delete cascade,
  source_id uuid not null,
  type text not null check (type in (
    'application_submitted',
    'inspection_scheduled',
    'inspection_reminder',
    'query_raised',
    'query_response_submitted',
    'sla_due_soon',
    'sla_overdue'
  )),
  category text not null check (category in (
    'Action Required',
    'Deadline',
    'Department Query',
    'Approval Update',
    'Inspection',
    'Scheme',
    'System'
  )),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_one_event unique (user_id, type, source_id)
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

alter table public.inspections enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.notifications enable row level security;

revoke all on public.inspections from public, anon, authenticated;
revoke all on public.inspection_reports from public, anon, authenticated;
revoke all on public.notifications from public, anon, authenticated;

grant select on public.inspections to authenticated;
grant select on public.inspection_reports to authenticated;
grant select, update on public.notifications to authenticated;

drop policy if exists inspections_select_participant on public.inspections;
create policy inspections_select_participant on public.inspections
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

drop policy if exists inspection_reports_select_participant on public.inspection_reports;
create policy inspection_reports_select_participant on public.inspection_reports
  for select to authenticated
  using (
    exists (
      select 1
      from public.inspections i
      join public.applications a on a.id = i.application_id
      join public.projects p on p.id = a.project_id
      where i.id = inspection_id
        and p.user_id = auth.uid()
    )
    or (
      public.current_user_role() in ('officer', 'admin')
      and exists (
        select 1
        from public.inspections i
        join public.application_department_workflows w on w.id = i.department_workflow_id
        join public.officer_departments od on od.department_id = w.department_id
        where i.id = inspection_id
          and od.user_id = auth.uid()
      )
    )
  );

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.protect_notification_columns()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.application_id is distinct from old.application_id
    or new.department_workflow_id is distinct from old.department_workflow_id
    or new.source_id is distinct from old.source_id
    or new.type is distinct from old.type
    or new.category is distinct from old.category
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at
  then
    raise exception 'notification cannot be changed directly';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_notification_columns on public.notifications;
create trigger protect_notification_columns
  before update on public.notifications
  for each row execute function public.protect_notification_columns();

create or replace function public.enqueue_notification(
  target_user uuid,
  target_application uuid,
  target_workflow uuid,
  target_source uuid,
  notification_type text,
  notification_category text,
  notification_title text,
  notification_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id,
    application_id,
    department_workflow_id,
    source_id,
    type,
    category,
    title,
    body
  ) values (
    target_user,
    target_application,
    target_workflow,
    target_source,
    notification_type,
    notification_category,
    notification_title,
    notification_body
  )
  on conflict (user_id, type, source_id) do nothing;
end;
$$;

-- Same submission transaction as Phase 5, plus a nullable SLA clock and one
-- applicant notification. Approval rows stay pending.
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

  update public.application_department_workflows w
  set sla_started_at = now(),
      sla_deadline = now() + make_interval(hours => t.sla_duration_hours)
  from public.application_approvals aa
  join public.approval_types t on t.id = aa.approval_type_id
  where w.application_approval_id = aa.id
    and w.application_id = target_application
    and t.sla_duration_hours is not null
    and w.sla_started_at is null;

  perform set_config('udyamsetu.application_transition', 'allowed', true);

  update public.applications
  set status = 'submitted',
      submitted_at = now()
  where id = target_application
    and status = 'draft';

  if not found then
    raise exception 'application was not submitted';
  end if;

  perform public.enqueue_notification(
    owner,
    target_application,
    null,
    target_application,
    'application_submitted',
    'System',
    'Application submitted',
    'The application was submitted and department workflows were created. This is not departmental acceptance.'
  );

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
  applicant uuid;
  query_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'query was not created';
  end if;

  if question is null or char_length(btrim(question)) = 0 or char_length(question) > 4000 then
    raise exception 'invalid query';
  end if;

  select w.application_id, w.department_id, a.status, p.user_id
    into workflow_application, workflow_department, application_status, applicant
  from public.application_department_workflows w
  join public.applications a on a.id = w.application_id
  join public.projects p on p.id = a.project_id
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

  perform public.enqueue_notification(
    applicant,
    workflow_application,
    target_workflow,
    query_id,
    'query_raised',
    'Department Query',
    'Department query',
    btrim(question)
  );

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
  workflow_department uuid;
  response_id uuid;
  open_count integer;
  officer_record record;
begin
  if auth.uid() is null or target_query is null then
    raise exception 'response was not recorded';
  end if;

  if answer is null or char_length(btrim(answer)) = 0 or char_length(answer) > 4000 then
    raise exception 'invalid response';
  end if;

  select p.user_id, q.status, q.application_id, w.department_id
    into owner, query_status, query_application, workflow_department
  from public.application_queries q
  join public.applications a on a.id = q.application_id
  join public.projects p on p.id = a.project_id
  join public.application_department_workflows w on w.id = q.department_workflow_id
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

  for officer_record in
    select od.user_id
    from public.officer_departments od
    where od.department_id = workflow_department
  loop
    perform public.enqueue_notification(
      officer_record.user_id,
      query_application,
      null,
      target_query,
      'query_response_submitted',
      'Department Query',
      'Query response submitted',
      'The applicant submitted a response. The query is not resolved.'
    );
  end loop;

  return response_id;
end;
$$;

create or replace function public.schedule_department_inspection(
  target_workflow uuid,
  scheduled_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_application uuid;
  workflow_department uuid;
  applicant uuid;
  site text;
  inspection_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'inspection was not scheduled';
  end if;

  if target_workflow is null or scheduled_at is null then
    raise exception 'invalid inspection schedule';
  end if;

  select w.application_id, w.department_id, p.user_id, p.location
    into workflow_application, workflow_department, applicant, site
  from public.application_department_workflows w
  join public.applications a on a.id = w.application_id
  join public.projects p on p.id = a.project_id
  where w.id = target_workflow
  for update of w;

  if workflow_application is null then
    raise exception 'inspection was not scheduled';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = workflow_department
  ) then
    raise exception 'inspection was not scheduled';
  end if;

  if exists (
    select 1
    from public.inspections i
    where i.department_workflow_id = target_workflow
      and i.status in ('scheduled', 'assigned')
  ) then
    raise exception 'inspection already scheduled';
  end if;

  insert into public.inspections (
    application_id,
    department_workflow_id,
    scheduled_at,
    status,
    assigned_officer_id,
    location
  ) values (
    workflow_application,
    target_workflow,
    scheduled_at,
    'assigned',
    auth.uid(),
    nullif(site, '')
  )
  returning id into inspection_id;

  perform public.enqueue_notification(
    applicant,
    workflow_application,
    target_workflow,
    inspection_id,
    'inspection_scheduled',
    'Inspection',
    'Inspection scheduled',
    'A department inspection was scheduled. This does not approve the application.'
  );

  perform public.enqueue_notification(
    auth.uid(),
    workflow_application,
    target_workflow,
    inspection_id,
    'inspection_scheduled',
    'Inspection',
    'Inspection assigned',
    'You are assigned to a department inspection.'
  );

  return inspection_id;
end;
$$;

create or replace function public.complete_department_inspection(
  target_inspection uuid,
  report_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inspection_status text;
  assignee uuid;
  workflow_department uuid;
  report_id uuid;
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'inspection was not completed';
  end if;

  if report_body is null or char_length(btrim(report_body)) = 0 or char_length(report_body) > 4000 then
    raise exception 'invalid inspection report';
  end if;

  select i.status, i.assigned_officer_id, w.department_id
    into inspection_status, assignee, workflow_department
  from public.inspections i
  join public.application_department_workflows w on w.id = i.department_workflow_id
  where i.id = target_inspection
  for update of i;

  if inspection_status is null then
    raise exception 'inspection was not completed';
  end if;

  if inspection_status not in ('scheduled', 'assigned') then
    raise exception 'inspection was not completed';
  end if;

  if not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = workflow_department
  ) then
    raise exception 'inspection was not completed';
  end if;

  if assignee is distinct from auth.uid() and public.current_user_role() is distinct from 'admin' then
    raise exception 'inspection was not completed';
  end if;

  insert into public.inspection_reports (
    inspection_id,
    body,
    created_by
  ) values (
    target_inspection,
    btrim(report_body),
    auth.uid()
  )
  returning id into report_id;

  update public.inspections
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = target_inspection
    and status in ('scheduled', 'assigned');

  return report_id;
end;
$$;

-- Technical display window only: 72 hours before a configured deadline, and
-- 24 hours before a scheduled inspection. This is not a statutory SLA.
-- Nothing in the application calls this on page load. A production scheduler
-- must call it. It inserts nothing when sla_deadline is null.
create or replace function public.evaluate_deadline_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_record record;
  inspection_record record;
  officer_record record;
begin
  for workflow_record in
    select w.id, w.application_id, w.department_id, w.sla_deadline, p.user_id as applicant
    from public.application_department_workflows w
    join public.applications a on a.id = w.application_id
    join public.projects p on p.id = a.project_id
    where w.sla_deadline is not null
      and w.sla_completed_at is null
      and w.sla_deadline <= now() + interval '72 hours'
  loop
    if workflow_record.sla_deadline < now() then
      perform public.enqueue_notification(
        workflow_record.applicant,
        workflow_record.application_id,
        workflow_record.id,
        workflow_record.id,
        'sla_overdue',
        'Deadline',
        'SLA overdue',
        'A configured workflow deadline has passed.'
      );
      for officer_record in
        select od.user_id
        from public.officer_departments od
        where od.department_id = workflow_record.department_id
      loop
        perform public.enqueue_notification(
          officer_record.user_id,
          workflow_record.application_id,
          workflow_record.id,
          workflow_record.id,
          'sla_overdue',
          'Deadline',
          'SLA overdue',
          'A configured workflow deadline has passed.'
        );
      end loop;
    else
      perform public.enqueue_notification(
        workflow_record.applicant,
        workflow_record.application_id,
        workflow_record.id,
        workflow_record.id,
        'sla_due_soon',
        'Deadline',
        'SLA due soon',
        'A configured workflow deadline is within 72 hours. This window is a display threshold, not a statutory SLA.'
      );
    end if;
  end loop;

  for inspection_record in
    select i.id, i.application_id, i.department_workflow_id, i.assigned_officer_id, p.user_id as applicant
    from public.inspections i
    join public.applications a on a.id = i.application_id
    join public.projects p on p.id = a.project_id
    where i.status in ('scheduled', 'assigned')
      and i.scheduled_at > now()
      and i.scheduled_at <= now() + interval '24 hours'
  loop
    perform public.enqueue_notification(
      inspection_record.applicant,
      inspection_record.application_id,
      inspection_record.department_workflow_id,
      inspection_record.id,
      'inspection_reminder',
      'Inspection',
      'Inspection reminder',
      'An inspection is scheduled within 24 hours.'
    );
    if inspection_record.assigned_officer_id is not null then
      perform public.enqueue_notification(
        inspection_record.assigned_officer_id,
        inspection_record.application_id,
        inspection_record.department_workflow_id,
        inspection_record.id,
        'inspection_reminder',
        'Inspection',
        'Inspection reminder',
        'An inspection assigned to you is scheduled within 24 hours.'
      );
    end if;
  end loop;

  return 0;
end;
$$;

create or replace function public.mark_notification_read(target_notification uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or target_notification is null then
    raise exception 'notification was not updated';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = target_notification
    and user_id = auth.uid();

  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    raise exception 'notification was not updated';
  end if;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'notification was not updated';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.protect_notification_columns() from public, anon, authenticated;
revoke all on function public.enqueue_notification(uuid, uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.schedule_department_inspection(uuid, timestamptz) from public, anon;
revoke all on function public.complete_department_inspection(uuid, text) from public, anon;
revoke all on function public.evaluate_deadline_notifications() from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.schedule_department_inspection(uuid, timestamptz) to authenticated;
grant execute on function public.complete_department_inspection(uuid, text) to authenticated;
grant execute on function public.evaluate_deadline_notifications() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
