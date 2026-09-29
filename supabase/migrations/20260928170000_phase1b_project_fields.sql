-- Phase 1B: fields the existing project screens already collect and display.
-- entity_name is the legal name on the project detail card.
-- location is the site address on the project list card and the detail card.
-- State, district, plot, employment, and utility fields stay off this table.
-- Does not insert projects or applications. Existing RLS policies still apply.

alter table public.projects add column if not exists entity_name text;
alter table public.projects add column if not exists location text;
