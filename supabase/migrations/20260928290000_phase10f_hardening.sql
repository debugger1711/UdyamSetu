-- Phase 10F: close two production gaps.
-- Deadline evaluation was granted to every signed-in user and scanned every
-- department. Project inserts could omit pollution category and stage, and the
-- database then stored orange and planning.

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
  actor_role text := public.current_user_role();
begin
  if auth.uid() is null or actor_role not in ('officer', 'admin') then
    raise exception 'deadlines were not evaluated';
  end if;

  for workflow_record in
    select w.id, w.application_id, w.department_id, w.sla_deadline, p.user_id as applicant
    from public.application_department_workflows w
    join public.applications a on a.id = w.application_id
    join public.projects p on p.id = a.project_id
    where w.sla_deadline is not null
      and w.sla_completed_at is null
      and w.sla_deadline <= now() + interval '72 hours'
      and (
        actor_role = 'admin'
        or exists (
          select 1
          from public.officer_departments od
          where od.user_id = auth.uid()
            and od.department_id = w.department_id
        )
      )
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
      and (
        actor_role = 'admin'
        or exists (
          select 1
          from public.application_department_workflows w
          join public.officer_departments od on od.department_id = w.department_id
          where w.id = i.department_workflow_id
            and od.user_id = auth.uid()
        )
      )
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

create or replace function public.evaluate_renewal_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  renewal_record record;
  officer_record record;
  actor_role text := public.current_user_role();
begin
  if auth.uid() is null or actor_role not in ('officer', 'admin') then
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
      and (
        actor_role = 'admin'
        or (
          w.department_id is not null
          and exists (
            select 1
            from public.officer_departments od
            where od.user_id = auth.uid()
              and od.department_id = w.department_id
          )
        )
      )
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

create or replace function public.record_document_analysis(
  target_document uuid,
  payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
  sanitized jsonb;
begin
  if auth.uid() is null or jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'document was not updated';
  end if;

  sanitized := (payload - 'status' - 'verified') || jsonb_build_object('officialVerification', false);

  update public.documents d
  set analysis = sanitized,
      updated_at = now()
  where d.id = target_document
    and d.status = 'uploaded'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id = d.application_id
        and p.user_id = auth.uid()
    );

  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    raise exception 'document was not updated';
  end if;
end;
$$;

alter table public.projects alter column pollution_category drop default;
alter table public.projects alter column stage drop default;
