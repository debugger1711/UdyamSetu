-- Phase 9C: provenance for official policy documents.
-- Ready documents stay searchable. A changed official file becomes a new
-- document and the previous hash is marked superseded. It is not deleted.

alter table public.knowledge_documents
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  where con.conrelid = 'public.knowledge_documents'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';
  if constraint_name is not null then
    execute format('alter table public.knowledge_documents drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.knowledge_documents
  add constraint knowledge_documents_status_check
  check (status in ('ready', 'superseded'));

drop function if exists public.ingest_knowledge_document(text, text, text, text, jsonb);

create function public.ingest_knowledge_document(
  document_title text,
  document_source text,
  document_uri text,
  document_hash text,
  chunk_rows jsonb,
  document_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_id uuid;
  row_item jsonb;
  row_index integer := 0;
  row_content text;
  row_embedding text;
  source_url text := nullif(btrim(coalesce(document_uri, '')), '');
begin
  if auth.uid() is null or public.current_user_role() not in ('officer', 'admin') then
    raise exception 'knowledge was not stored';
  end if;

  if document_title is null
    or char_length(btrim(document_title)) = 0
    or char_length(document_title) > 200
    or document_source is null
    or char_length(btrim(document_source)) = 0
    or char_length(document_source) > 200
    or document_hash is null
    or chunk_rows is null
    or jsonb_typeof(chunk_rows) is distinct from 'array'
    or jsonb_array_length(chunk_rows) = 0
    or jsonb_array_length(chunk_rows) > 800
    or document_metadata is null
    or jsonb_typeof(document_metadata) is distinct from 'object'
    or char_length(document_metadata::text) > 4000
  then
    raise exception 'invalid knowledge document';
  end if;

  if exists (
    select 1 from public.knowledge_documents d where d.content_sha256 = document_hash
  ) then
    raise exception 'knowledge document already stored';
  end if;

  if source_url is not null then
    update public.knowledge_documents
    set status = 'superseded',
        updated_at = now()
    where source_uri = source_url
      and content_sha256 is distinct from document_hash
      and status = 'ready';
  end if;

  insert into public.knowledge_documents (
    title,
    source_label,
    source_uri,
    content_sha256,
    status,
    created_by,
    metadata
  ) values (
    btrim(document_title),
    btrim(document_source),
    source_url,
    document_hash,
    'ready',
    auth.uid(),
    document_metadata
  )
  returning id into stored_id;

  for row_item in
    select value from jsonb_array_elements(chunk_rows)
  loop
    row_content := row_item->>'content';
    row_embedding := nullif(row_item->>'embedding', '');
    if row_content is null or char_length(btrim(row_content)) = 0 then
      raise exception 'invalid knowledge document';
    end if;

    insert into public.knowledge_chunks (
      document_id,
      chunk_index,
      content,
      embedding
    ) values (
      stored_id,
      row_index,
      btrim(row_content),
      case when row_embedding is null then null else row_embedding::extensions.vector(768) end
    );
    row_index := row_index + 1;
  end loop;

  return stored_id;
exception
  when unique_violation then
    raise exception 'knowledge document already stored';
end;
$$;

revoke all on function public.ingest_knowledge_document(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.ingest_knowledge_document(text, text, text, text, jsonb, jsonb) to authenticated;
