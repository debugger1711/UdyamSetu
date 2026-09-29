-- Phase 8: scoped analytics counts.
-- Does not insert projects, applications, users, or metric rows.
-- Does not change row policies. Callers receive counts, not record bodies.

create index if not exists projects_created_at_idx
  on public.projects (created_at);

create index if not exists applications_created_at_idx
  on public.applications (created_at);

create index if not exists documents_uploaded_at_idx
  on public.documents (uploaded_at);

create index if not exists application_department_workflows_created_at_idx
  on public.application_department_workflows (created_at);

create index if not exists application_queries_created_at_idx
  on public.application_queries (created_at);

create index if not exists inspections_created_at_idx
  on public.inspections (created_at);

create or replace function public.analytics_grievance_visible(
  actor uuid,
  actor_role text,
  created_by uuid,
  assigned_department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select actor_role = 'admin'
    or (actor_role = 'applicant' and created_by = actor)
    or (
      actor_role = 'officer'
      and assigned_department_id is not null
      and exists (
        select 1
        from public.officer_departments od
        where od.department_id = assigned_department_id
          and od.user_id = actor
      )
    );
$$;

create or replace function public.analytics_query_visible(
  actor uuid,
  actor_role text,
  application_id uuid,
  department_workflow_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select actor_role = 'admin'
    or (
      actor_role = 'applicant'
      and exists (
        select 1
        from public.applications a
        join public.projects p on p.id = a.project_id
        where a.id = application_id
          and p.user_id = actor
      )
    )
    or (
      actor_role = 'officer'
      and exists (
        select 1
        from public.application_department_workflows w
        join public.officer_departments od
          on od.department_id = w.department_id
         and od.user_id = actor
        where w.id = department_workflow_id
      )
    );
$$;

create or replace function public.analytics_inspection_visible(
  actor uuid,
  actor_role text,
  application_id uuid,
  department_workflow_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.analytics_query_visible(actor, actor_role, application_id, department_workflow_id);
$$;

create or replace function public.analytics_snapshot(p_start timestamptz, p_end timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_role text := public.current_user_role();
begin
  if actor is null then
    raise exception 'authentication required';
  end if;
  if actor_role is null or actor_role not in ('applicant', 'officer', 'admin') then
    raise exception 'analytics is not available';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid analytics range';
  end if;

  return (
    with viewer as (
      select actor as id, actor_role as role
    ),
    visible_apps as (
      select a.id
      from public.applications a
      join public.projects p on p.id = a.project_id
      cross join viewer
      where viewer.role = 'admin'
        or (viewer.role = 'applicant' and p.user_id = viewer.id)
        or (
          viewer.role = 'officer'
          and exists (
            select 1
            from public.application_department_workflows w
            join public.officer_departments od
              on od.department_id = w.department_id
             and od.user_id = viewer.id
            where w.application_id = a.id
          )
        )
    ),
    ranged_apps as (
      select a.id, a.status
      from public.applications a
      join visible_apps v on v.id = a.id
      where a.created_at >= p_start
        and a.created_at < p_end
    ),
    ranged_workflows as (
      select
        d.name as department,
        w.sla_started_at,
        w.sla_deadline,
        w.sla_completed_at,
        w.created_at
      from public.application_department_workflows w
      join public.departments d on d.id = w.department_id
      cross join viewer
      where w.created_at >= p_start
        and w.created_at < p_end
        and (
          viewer.role = 'admin'
          or (
            viewer.role = 'applicant'
            and exists (
              select 1
              from public.applications a
              join public.projects p on p.id = a.project_id
              where a.id = w.application_id
                and p.user_id = viewer.id
            )
          )
          or (
            viewer.role = 'officer'
            and exists (
              select 1
              from public.officer_departments od
              where od.department_id = w.department_id
                and od.user_id = viewer.id
            )
          )
        )
    )
    select jsonb_build_object(
      'scope', case actor_role
        when 'admin' then 'system'
        when 'officer' then 'department'
        else 'own'
      end,
      'projects', (
        select count(*)
        from public.projects p
        cross join viewer
        where p.created_at >= p_start
          and p.created_at < p_end
          and (
            viewer.role = 'admin'
            or (viewer.role = 'applicant' and p.user_id = viewer.id)
            or (
              viewer.role = 'officer'
              and exists (
                select 1
                from public.applications a
                join public.application_department_workflows w on w.application_id = a.id
                join public.officer_departments od
                  on od.department_id = w.department_id
                 and od.user_id = viewer.id
                where a.project_id = p.id
              )
            )
          )
      ),
      'applications', (select count(*) from ranged_apps),
      'applicationStatuses', coalesce((
        select jsonb_object_agg(status, tally)
        from (
          select status, count(*) as tally
          from ranged_apps
          group by status
        ) grouped
      ), '{}'::jsonb),
      'approvalsPending', (
        select count(*)
        from public.application_approvals aa
        join ranged_apps a on a.id = aa.application_id
        where aa.status = 'pending'
      ),
      'approvalStatuses', coalesce((
        select jsonb_object_agg(status, tally)
        from (
          select aa.status, count(*) as tally
          from public.application_approvals aa
          join ranged_apps a on a.id = aa.application_id
          group by aa.status
        ) grouped
      ), '{}'::jsonb),
      'documentsUploaded', (
        select count(*)
        from public.documents d
        join visible_apps a on a.id = d.application_id
        where d.uploaded_at >= p_start
          and d.uploaded_at < p_end
          and d.status = 'uploaded'
      ),
      'documentStatuses', coalesce((
        select jsonb_object_agg(status, tally)
        from (
          select d.status, count(*) as tally
          from public.documents d
          join visible_apps a on a.id = d.application_id
          where d.uploaded_at >= p_start
            and d.uploaded_at < p_end
          group by d.status
        ) grouped
      ), '{}'::jsonb),
      'queries', jsonb_build_object(
        'open', (
          select count(*) from public.application_queries q
          cross join viewer
          where q.created_at >= p_start and q.created_at < p_end and q.status = 'open'
            and public.analytics_query_visible(viewer.id, viewer.role, q.application_id, q.department_workflow_id)
        ),
        'responded', (
          select count(*) from public.application_queries q
          cross join viewer
          where q.created_at >= p_start and q.created_at < p_end and q.status = 'responded'
            and public.analytics_query_visible(viewer.id, viewer.role, q.application_id, q.department_workflow_id)
        ),
        'resolved', (
          select count(*) from public.application_queries q
          cross join viewer
          where q.created_at >= p_start and q.created_at < p_end and q.status = 'resolved'
            and public.analytics_query_visible(viewer.id, viewer.role, q.application_id, q.department_workflow_id)
        )
      ),
      'inspections', jsonb_build_object(
        'scheduled', (
          select count(*) from public.inspections i
          cross join viewer
          where i.created_at >= p_start and i.created_at < p_end and i.status = 'scheduled'
            and public.analytics_inspection_visible(viewer.id, viewer.role, i.application_id, i.department_workflow_id)
        ),
        'assigned', (
          select count(*) from public.inspections i
          cross join viewer
          where i.created_at >= p_start and i.created_at < p_end and i.status = 'assigned'
            and public.analytics_inspection_visible(viewer.id, viewer.role, i.application_id, i.department_workflow_id)
        ),
        'completed', (
          select count(*) from public.inspections i
          cross join viewer
          where i.created_at >= p_start and i.created_at < p_end and i.status = 'completed'
            and public.analytics_inspection_visible(viewer.id, viewer.role, i.application_id, i.department_workflow_id)
        ),
        'cancelled', (
          select count(*) from public.inspections i
          cross join viewer
          where i.created_at >= p_start and i.created_at < p_end and i.status = 'cancelled'
            and public.analytics_inspection_visible(viewer.id, viewer.role, i.application_id, i.department_workflow_id)
        )
      ),
      'workflowCount', (select count(*) from ranged_workflows),
      'workflowsTruncated', (select count(*) > 2000 from ranged_workflows),
      'workflows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'department', department,
          'slaStartedAt', sla_started_at,
          'slaDeadline', sla_deadline,
          'slaCompletedAt', sla_completed_at
        ))
        from (
          select department, sla_started_at, sla_deadline, sla_completed_at
          from ranged_workflows
          order by created_at desc
          limit 2000
        ) limited
      ), '[]'::jsonb),
      'certificates', jsonb_build_object(
        'issued', (
          select count(*) from public.certificates c
          join visible_apps a on a.id = c.application_id
          where c.created_at >= p_start and c.created_at < p_end and c.status = 'issued'
        ),
        'expired', (
          select count(*) from public.certificates c
          join visible_apps a on a.id = c.application_id
          where c.created_at >= p_start and c.created_at < p_end and c.status = 'expired'
        ),
        'revoked', (
          select count(*) from public.certificates c
          join visible_apps a on a.id = c.application_id
          where c.created_at >= p_start and c.created_at < p_end and c.status = 'revoked'
        )
      ),
      'renewals', jsonb_build_object(
        'due', (
          select count(*) from public.renewals r
          join visible_apps a on a.id = r.application_id
          where r.created_at >= p_start and r.created_at < p_end and r.status = 'due'
        ),
        'submitted', (
          select count(*) from public.renewals r
          join visible_apps a on a.id = r.application_id
          where r.created_at >= p_start and r.created_at < p_end and r.status = 'submitted'
        ),
        'under_review', (
          select count(*) from public.renewals r
          join visible_apps a on a.id = r.application_id
          where r.created_at >= p_start and r.created_at < p_end and r.status = 'under_review'
        ),
        'completed', (
          select count(*) from public.renewals r
          join visible_apps a on a.id = r.application_id
          where r.created_at >= p_start and r.created_at < p_end and r.status = 'completed'
        ),
        'expired', (
          select count(*) from public.renewals r
          join visible_apps a on a.id = r.application_id
          where r.created_at >= p_start and r.created_at < p_end and r.status = 'expired'
        )
      ),
      'activeSchemes', (
        select count(*) from public.schemes where status = 'active'
      ),
      'schemeClaims', jsonb_build_object(
        'draft', (
          select count(*)
          from public.scheme_applications sa
          join public.schemes s on s.id = sa.scheme_id
          join public.projects p on p.id = sa.project_id
          cross join viewer
          where sa.created_at >= p_start
            and sa.created_at < p_end
            and sa.status = 'draft'
            and (
              viewer.role = 'admin'
              or (viewer.role = 'applicant' and p.user_id = viewer.id)
              or (
                viewer.role = 'officer'
                and s.department_id is not null
                and exists (
                  select 1 from public.officer_departments od
                  where od.department_id = s.department_id
                    and od.user_id = viewer.id
                )
              )
            )
        ),
        'submitted', (
          select count(*)
          from public.scheme_applications sa
          join public.schemes s on s.id = sa.scheme_id
          join public.projects p on p.id = sa.project_id
          cross join viewer
          where sa.created_at >= p_start
            and sa.created_at < p_end
            and sa.status = 'submitted'
            and (
              viewer.role = 'admin'
              or (viewer.role = 'applicant' and p.user_id = viewer.id)
              or (
                viewer.role = 'officer'
                and s.department_id is not null
                and exists (
                  select 1 from public.officer_departments od
                  where od.department_id = s.department_id
                    and od.user_id = viewer.id
                )
              )
            )
        )
      ),
      'grievances', jsonb_build_object(
        'open', (
          select count(*) from public.grievances g
          cross join viewer
          where g.created_at >= p_start and g.created_at < p_end and g.status = 'open'
            and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
        ),
        'assigned', (
          select count(*) from public.grievances g
          cross join viewer
          where g.created_at >= p_start and g.created_at < p_end and g.status = 'assigned'
            and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
        ),
        'in_progress', (
          select count(*) from public.grievances g
          cross join viewer
          where g.created_at >= p_start and g.created_at < p_end and g.status = 'in_progress'
            and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
        ),
        'resolved', (
          select count(*) from public.grievances g
          cross join viewer
          where g.created_at >= p_start and g.created_at < p_end and g.status = 'resolved'
            and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
        ),
        'closed', (
          select count(*) from public.grievances g
          cross join viewer
          where g.created_at >= p_start and g.created_at < p_end and g.status = 'closed'
            and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
        )
      ),
      'escalations', (
        select count(*)
        from public.grievance_escalations e
        join public.grievances g on g.id = e.grievance_id
        cross join viewer
        where e.created_at >= p_start
          and e.created_at < p_end
          and public.analytics_grievance_visible(viewer.id, viewer.role, g.created_by, g.assigned_department_id)
      ),
      'notifications', jsonb_build_object(
        'total', (
          select count(*)
          from public.notifications n
          cross join viewer
          where n.created_at >= p_start
            and n.created_at < p_end
            and (viewer.role = 'admin' or n.user_id = viewer.id)
        ),
        'unread', (
          select count(*)
          from public.notifications n
          cross join viewer
          where n.created_at >= p_start
            and n.created_at < p_end
            and n.read_at is null
            and (viewer.role = 'admin' or n.user_id = viewer.id)
        )
      ),
      'knowledgeDocuments', (
        select count(*) from public.knowledge_documents where status = 'ready'
      ),
      'knowledgeChunks', (
        select count(*)
        from public.knowledge_chunks c
        join public.knowledge_documents d on d.id = c.document_id
        where d.status = 'ready'
      )
    )
    from viewer
  );
end;
$$;

revoke all on function public.analytics_snapshot(timestamptz, timestamptz) from public, anon;
revoke all on function public.analytics_grievance_visible(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.analytics_query_visible(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.analytics_inspection_visible(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.analytics_snapshot(timestamptz, timestamptz) to authenticated;
