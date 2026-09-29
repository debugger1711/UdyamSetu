-- Phase 10D: append approval codes as text arrays.
-- The previous assignments passed a scalar text into text[] || text[],
-- which PostgreSQL parsed as an array literal and rejected.
-- The selected codes are unchanged.

create or replace function public.generate_application_approvals(target_application uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  land text;
  pollution text;
  codes text[] := array[]::text[];
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select p.user_id, p.land_classification, p.pollution_category
    into owner, land, pollution
  from public.applications a
  join public.projects p on p.id = a.project_id
  where a.id = target_application;

  if owner is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if land is null or land not in (
    'industrial_estate',
    'private_agricultural',
    'private_non_agricultural',
    'sez'
  ) or pollution is null or pollution not in ('white', 'green', 'orange', 'red') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_PROJECT_INFORMATION'
    );
  end if;

  if land = 'industrial_estate' then
    codes := codes || array['MIDC_LAND_ALLOTMENT'];
  else
    codes := codes || array['NA_LAND_CONVERSION'];
  end if;

  if pollution in ('red', 'orange') then
    codes := codes || array['PCB_CTE', 'PCB_CTO'];
  elsif pollution = 'green' then
    codes := codes || array['PCB_GREEN_CONSENT'];
  end if;

  codes := codes || array['FIRE_NOC', 'FACTORY_PLAN_DISH', 'POWER_FEASIBILITY'];

  if (
    select count(*)
    from unnest(codes) as required(code)
    join public.approval_types t on t.code = required.code
  ) <> coalesce(array_length(codes, 1), 0) then
    raise exception 'unknown approval code';
  end if;

  insert into public.application_approvals (
    application_id,
    approval_type_id,
    status,
    sort_order,
    required
  )
  select
    target_application,
    t.id,
    'pending',
    required.ordinality::integer,
    true
  from unnest(codes) with ordinality as required(code, ordinality)
  join public.approval_types t on t.code = required.code
  on conflict (application_id, approval_type_id) do nothing;

  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'codes', to_jsonb(codes),
    'inserted', inserted_count
  );
end;
$$;

revoke all on function public.generate_application_approvals(uuid) from public, anon;
grant execute on function public.generate_application_approvals(uuid) to authenticated;
