-- Phase 10B: stop row-level policies from calling each other.
-- The visibility rules stay the same. The checks run as the table owner so a
-- project policy does not re-enter an application policy, and the reverse.

create or replace function public.officer_assigned_to_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.applications a
      join public.application_department_workflows w on w.application_id = a.id
      join public.officer_departments od on od.department_id = w.department_id
      where a.project_id = target_project
        and od.user_id = auth.uid()
    );
$$;

create or replace function public.officer_assigned_to_application(target_application uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id = target_application
        and od.user_id = auth.uid()
    );
$$;

create or replace function public.officer_can_read_profile(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.projects p
      join public.applications a on a.project_id = p.id
      join public.application_department_workflows w on w.application_id = a.id
      join public.officer_departments od on od.department_id = w.department_id
      where p.user_id = target_profile
        and od.user_id = auth.uid()
    );
$$;

revoke all on function public.officer_assigned_to_project(uuid) from public, anon;
revoke all on function public.officer_assigned_to_application(uuid) from public, anon;
revoke all on function public.officer_can_read_profile(uuid) from public, anon;
grant execute on function public.officer_assigned_to_project(uuid) to authenticated;
grant execute on function public.officer_assigned_to_application(uuid) to authenticated;
grant execute on function public.officer_can_read_profile(uuid) to authenticated;

drop policy if exists projects_select_department on public.projects;
create policy projects_select_department on public.projects
  for select to authenticated
  using (public.officer_assigned_to_project(id));

drop policy if exists applications_select_department on public.applications;
create policy applications_select_department on public.applications
  for select to authenticated
  using (public.officer_assigned_to_application(id));

drop policy if exists profiles_select_department_applicant on public.profiles;
create policy profiles_select_department_applicant on public.profiles
  for select to authenticated
  using (public.officer_can_read_profile(id));
