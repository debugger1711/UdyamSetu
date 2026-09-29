-- Phase 10F: storage policies compared the object path with projects.name.
-- Inside the ownership subquery, the unqualified name column is the project
-- name, so a private upload never matched the application id.

drop policy if exists application_documents_select on storage.objects;
create policy application_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(storage.objects.name))[1] = 'application'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(storage.objects.name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_insert on storage.objects;
create policy application_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(storage.objects.name))[1] = 'application'
    and (storage.foldername(storage.objects.name))[3] = 'documents'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(storage.objects.name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_delete on storage.objects;
create policy application_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(storage.objects.name))[1] = 'application'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(storage.objects.name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_select_department on storage.objects;
create policy application_documents_select_department on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(storage.objects.name))[1] = 'application'
    and public.current_user_role() in ('officer', 'admin')
    and exists (
      select 1
      from public.application_department_workflows w
      join public.officer_departments od on od.department_id = w.department_id
      where w.application_id::text = (storage.foldername(storage.objects.name))[2]
        and od.user_id = auth.uid()
    )
  );
