-- Phase 9: regulatory knowledge documents, chunks, embeddings, and search.
-- Does not insert laws, schemes, or demo text.
-- pgvector stores embeddings. Search returns no rows until a source is ingested.
-- Applicants can read ready reference chunks. They cannot insert them.

create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_label text not null,
  source_uri text,
  content_sha256 text not null unique,
  status text not null check (status in ('ready')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(btrim(content)) > 0),
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  constraint knowledge_chunks_one_index unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

revoke all on public.knowledge_documents from public, anon, authenticated;
revoke all on public.knowledge_chunks from public, anon, authenticated;

grant select on public.knowledge_documents to authenticated;
grant select on public.knowledge_chunks to authenticated;

drop policy if exists knowledge_documents_select_ready on public.knowledge_documents;
create policy knowledge_documents_select_ready on public.knowledge_documents
  for select to authenticated
  using (status = 'ready');

drop policy if exists knowledge_chunks_select_ready on public.knowledge_chunks;
create policy knowledge_chunks_select_ready on public.knowledge_chunks
  for select to authenticated
  using (
    exists (
      select 1
      from public.knowledge_documents d
      where d.id = document_id
        and d.status = 'ready'
    )
  );

create or replace function public.ingest_knowledge_document(
  document_title text,
  document_source text,
  document_uri text,
  document_hash text,
  chunk_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  document_id uuid;
  row_item jsonb;
  row_index integer := 0;
  row_content text;
  row_embedding text;
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
    or jsonb_array_length(chunk_rows) > 120
  then
    raise exception 'invalid knowledge document';
  end if;

  if exists (
    select 1 from public.knowledge_documents d where d.content_sha256 = document_hash
  ) then
    raise exception 'knowledge document already stored';
  end if;

  insert into public.knowledge_documents (
    title,
    source_label,
    source_uri,
    content_sha256,
    status,
    created_by
  ) values (
    btrim(document_title),
    btrim(document_source),
    nullif(btrim(coalesce(document_uri, '')), ''),
    document_hash,
    'ready',
    auth.uid()
  )
  returning id into document_id;

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
      document_id,
      row_index,
      btrim(row_content),
      case when row_embedding is null then null else row_embedding::extensions.vector(768) end
    );
    row_index := row_index + 1;
  end loop;

  return document_id;
exception
  when unique_violation then
    raise exception 'knowledge document already stored';
end;
$$;

create or replace function public.search_knowledge_chunks(
  query_embedding text,
  match_count integer
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  source_label text,
  source_uri text,
  excerpt text,
  distance double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    d.title,
    d.source_label,
    d.source_uri,
    left(c.content, 700),
    (c.embedding <=> query_embedding::extensions.vector(768))::double precision
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where d.status = 'ready'
    and c.embedding is not null
    and match_count between 1 and 8
    and auth.uid() is not null
  order by c.embedding <=> query_embedding::extensions.vector(768)
  limit least(match_count, 8);
$$;

create or replace function public.search_knowledge_text(
  query_text text,
  match_count integer
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  source_label text,
  source_uri text,
  excerpt text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    d.title,
    d.source_label,
    d.source_uri,
    left(c.content, 700)
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where d.status = 'ready'
    and auth.uid() is not null
    and match_count between 1 and 8
    and char_length(btrim(query_text)) > 0
    and to_tsvector('simple', c.content) @@ plainto_tsquery('simple', query_text)
  order by ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', query_text)) desc
  limit least(match_count, 8);
$$;

revoke all on function public.ingest_knowledge_document(text, text, text, text, jsonb) from public, anon;
revoke all on function public.search_knowledge_chunks(text, integer) from public, anon;
revoke all on function public.search_knowledge_text(text, integer) from public, anon;

grant execute on function public.ingest_knowledge_document(text, text, text, text, jsonb) to authenticated;
grant execute on function public.search_knowledge_chunks(text, integer) to authenticated;
grant execute on function public.search_knowledge_text(text, integer) to authenticated;
