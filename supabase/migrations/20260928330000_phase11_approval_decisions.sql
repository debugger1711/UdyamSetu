-- Phase 11: Real officer approval & rejection decision workflow.
-- Widens status constraints on application_approvals, application_department_workflows,
-- applications, and notifications, and provides the transactional RPC record_department_decision.

-- 1. application_approvals: permit granted, rejected, under_review
alter table public.application_approvals
  drop constraint if exists application_approvals_status_check;

alter table public.application_approvals
  add constraint application_approvals_status_check
  check (status in ('pending', 'under_review', 'granted', 'rejected'));

-- 2. application_department_workflows: permit under_review, granted, rejected
alter table public.application_department_workflows
  drop constraint if exists application_department_workflows_status_check;

alter table public.application_department_workflows
  add constraint application_department_workflows_status_check
  check (status in ('submitted', 'under_review', 'granted', 'rejected'));

-- 3. applications: permit granted, rejected
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'draft',
    'submitted',
    'under_review',
    'query_raised',
    'query_response_submitted',
    'granted',
    'rejected'
  ));

-- 4. notifications: permit approval_granted, approval_rejected
alter table public.notifications
  drop constraint if exists notifications_type_check;

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
    'grievance_resolved',
    'approval_granted',
    'approval_rejected'
  ));

-- 5. RPC record_department_decision
create or replace function public.record_department_decision(
  target_workflow uuid,
  decision text,
  remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_record record;
  total_required integer;
  granted_required integer;
  rejected_required integer;
begin
  -- 1. Check actor authentication and role
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'permission denied';
  end if;

  -- 2. Validate decision value
  if decision not in ('granted', 'rejected') then
    raise exception 'invalid decision status';
  end if;

  -- 3. Validate rejection remarks
  if decision = 'rejected' and (remarks is null or char_length(btrim(remarks)) < 5) then
    raise exception 'rejection remarks are required';
  end if;

  -- 4. Fetch and lock workflow record with dependencies
  select
    w.id as workflow_id,
    w.application_id,
    w.application_approval_id,
    w.department_id,
    w.status as workflow_status,
    aa.status as approval_status,
    d.name as department_name,
    t.code as approval_code,
    p.user_id as applicant_user_id
  into workflow_record
  from public.application_department_workflows w
  join public.departments d on d.id = w.department_id
  join public.application_approvals aa on aa.id = w.application_approval_id
  join public.approval_types t on t.id = aa.approval_type_id
  join public.applications a on a.id = w.application_id
  join public.projects p on p.id = a.project_id
  where w.id = target_workflow
  for update of w;

  if not found then
    raise exception 'workflow not found';
  end if;

  -- 5. Verify departmental authorization (officer must belong to workflow department; admin allowed)
  if public.current_user_role() is distinct from 'admin' and not exists (
    select 1
    from public.officer_departments od
    where od.user_id = auth.uid()
      and od.department_id = workflow_record.department_id
  ) then
    raise exception 'officer is not assigned to this department';
  end if;

  -- 6. Idempotency: if already decided in the target state, return idempotent success
  if workflow_record.workflow_status = decision and workflow_record.approval_status = decision then
    return jsonb_build_object(
      'ok', true,
      'workflowId', target_workflow,
      'approvalId', workflow_record.application_approval_id,
      'decision', decision,
      'alreadyDecided', true
    );
  end if;

  -- 7. Block invalid contradictory state transitions (granted -> rejected, rejected -> granted)
  if workflow_record.workflow_status in ('granted', 'rejected') and workflow_record.workflow_status is distinct from decision then
    raise exception 'cannot change a finalized approval decision';
  end if;

  -- 8. Apply workflow status transition
  update public.application_department_workflows
  set status = decision,
      updated_at = now()
  where id = target_workflow;

  -- 9. Apply approval instance status transition
  update public.application_approvals
  set status = decision,
      updated_at = now()
  where id = workflow_record.application_approval_id;

  -- 10. Update parent application status with workflow transition bypass
  perform set_config('udyamsetu.application_transition', 'allowed', true);

  if decision = 'rejected' then
    update public.applications
    set status = 'rejected',
        updated_at = now()
    where id = workflow_record.application_id;
  else
    -- For granted, check status of all required departmental approval instances
    select
      count(*),
      count(*) filter (where aa.status = 'granted'),
      count(*) filter (where aa.status = 'rejected')
    into
      total_required,
      granted_required,
      rejected_required
    from public.application_approvals aa
    join public.approval_types t on t.id = aa.approval_type_id
    where aa.application_id = workflow_record.application_id
      and aa.required = true
      and t.department is not null;

    if rejected_required > 0 then
      update public.applications
      set status = 'rejected',
          updated_at = now()
      where id = workflow_record.application_id;
    elsif total_required > 0 and total_required = granted_required then
      update public.applications
      set status = 'granted',
          updated_at = now()
      where id = workflow_record.application_id;
    else
      update public.applications
      set status = 'under_review',
          updated_at = now()
      where id = workflow_record.application_id;
    end if;
  end if;

  -- 11. Enqueue applicant notification
  perform public.enqueue_notification(
    workflow_record.applicant_user_id,
    workflow_record.application_id,
    target_workflow,
    target_workflow,
    case when decision = 'granted' then 'approval_granted' else 'approval_rejected' end,
    'Approval Update',
    case when decision = 'granted'
      then 'Approval Granted: ' || workflow_record.approval_code
      else 'Approval Rejected: ' || workflow_record.approval_code
    end,
    case when decision = 'granted'
      then coalesce(nullif(btrim(remarks), ''), workflow_record.department_name || ' has granted approval for ' || workflow_record.approval_code || '.')
      else 'Approval request for ' || workflow_record.approval_code || ' was rejected by ' || workflow_record.department_name || '. Reason: ' || btrim(remarks)
    end
  );

  return jsonb_build_object(
    'ok', true,
    'workflowId', target_workflow,
    'approvalId', workflow_record.application_approval_id,
    'decision', decision,
    'alreadyDecided', false
  );
end;
$$;

revoke all on function public.record_department_decision(uuid, text, text) from public, anon;
grant execute on function public.record_department_decision(uuid, text, text) to authenticated;
