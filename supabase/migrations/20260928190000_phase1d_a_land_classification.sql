-- Phase 1D-A: land classification is the missing input in determineRequiredApprovals.
-- Source: lib/rules/approval-rules.ts branches on industrial_estate versus every other value.
-- Accepted values match types/project.ts LandClassification.
-- Nullable, with no default, so an existing project is not silently treated as an industrial estate.
-- Does not insert projects or create approval tables.

alter table public.projects add column if not exists land_classification text;

alter table public.projects drop constraint if exists projects_land_classification_check;
alter table public.projects
  add constraint projects_land_classification_check
  check (
    land_classification is null
    or land_classification in (
      'industrial_estate',
      'private_agricultural',
      'private_non_agricultural',
      'sez'
    )
  );
