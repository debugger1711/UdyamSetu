-- Phase 1C: an application can exist before an approval catalog entry.
-- title is the name shown on the application list and detail screens.
-- approval_id stays for the later approval engine and is no longer required.
-- Does not insert applications. Existing ownership policies are unchanged.

alter table public.applications add column if not exists title text;
alter table public.applications alter column approval_id drop not null;
