-- Phase 4: private document storage and application document records.
-- Does not insert applications, approvals, or document rows.

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  application_approval_id uuid references public.application_approvals (id) on delete set null,
  name text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  status text not null default 'uploaded' check (status in ('uploaded')),
  category text not null,
  authority text,
  analysis jsonb,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_application_id_idx on public.documents (application_id);
create index if not exists documents_application_approval_id_idx on public.documents (application_approval_id);

alter table public.documents enable row level security;

revoke all on public.documents from public, anon, authenticated;
grant select on public.documents to authenticated;

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own on public.documents
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

drop policy if exists application_documents_select on storage.objects;
create policy application_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = 'application'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_insert on storage.objects;
create policy application_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = 'application'
    and (storage.foldername(name))[3] = 'documents'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(name))[2]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists application_documents_delete on storage.objects;
create policy application_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = 'application'
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(name))[2]
        and p.user_id = auth.uid()
    )
  );

-- The browser does not choose the storage path. This function builds it and
-- records the document only after the object exists. Status stays uploaded.
create or replace function public.register_uploaded_document(
  target_application uuid,
  target_document uuid,
  target_approval uuid,
  document_name text,
  safe_file_name text,
  document_mime text,
  document_size bigint,
  document_category text,
  document_authority text
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  owner uuid;
  storage_path text;
begin
  if auth.uid() is null or target_document is null or document_size is null or document_size <= 0 then
    raise exception 'document was not registered';
  end if;

  if safe_file_name is null
    or safe_file_name !~ '^[A-Za-z0-9._-]{1,120}$'
    or safe_file_name like '%..%'
    or position('/' in safe_file_name) > 0
  then
    raise exception 'unsafe filename';
  end if;

  select p.user_id into owner
  from public.applications a
  join public.projects p on p.id = a.project_id
  where a.id = target_application;

  if owner is distinct from auth.uid() then
    raise exception 'document was not registered';
  end if;

  if target_approval is not null and not exists (
    select 1 from public.application_approvals aa
    where aa.id = target_approval
      and aa.application_id = target_application
  ) then
    raise exception 'approval does not belong to this application';
  end if;

  storage_path := 'application/' || target_application::text || '/documents/' || target_document::text || '/' || safe_file_name;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'application-documents'
      and name = storage_path
  ) then
    raise exception 'stored file missing';
  end if;

  insert into public.documents (
    id,
    application_id,
    application_approval_id,
    name,
    file_name,
    storage_path,
    mime_type,
    file_size,
    status,
    category,
    authority
  ) values (
    target_document,
    target_application,
    target_approval,
    document_name,
    safe_file_name,
    storage_path,
    document_mime,
    document_size,
    'uploaded',
    document_category,
    nullif(document_authority, '')
  );

  return target_document;
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
begin
  if auth.uid() is null then
    raise exception 'document was not updated';
  end if;

  update public.documents d
  set analysis = payload,
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

revoke all on function public.register_uploaded_document(uuid, uuid, uuid, text, text, text, bigint, text, text) from public, anon;
revoke all on function public.record_document_analysis(uuid, jsonb) from public, anon;
grant execute on function public.register_uploaded_document(uuid, uuid, uuid, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.record_document_analysis(uuid, jsonb) to authenticated;
