-- Pending officer registration.
-- Choosing officer at signup records a request. It does not assign the officer
-- account type or a department. An administrator activates the request.

create table public.officer_registrations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  department_id uuid references public.departments (id),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by uuid references public.profiles (id)
);

alter table public.officer_registrations enable row level security;

revoke all on public.officer_registrations from public, anon, authenticated;
grant select on public.officer_registrations to authenticated;

create policy officer_registrations_select_own
  on public.officer_registrations
  for select
  to authenticated
  using (user_id = auth.uid());

-- Signup still creates an applicant. A registration flag only stores a request.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'applicant'
  );

  if coalesce(new.raw_user_meta_data->>'officer_registration', '') = 'true' then
    insert into public.officer_registrations (user_id, status)
    values (new.id, 'pending');
  end if;

  return new;
end;
$$;

-- The signed-in user still cannot change an account type.
-- Activation is allowed only inside activate_officer_registration, and only
-- when the caller is an administrator.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if current_setting('udyamsetu.officer_activation', true) = 'allowed'
     and public.current_user_role() = 'admin'
     and old.role = 'applicant'
     and new.role = 'officer' then
    return new;
  end if;

  raise exception 'profile role cannot be changed by the signed-in user';
end;
$$;

create or replace function public.activate_officer_registration(
  target_email text,
  department_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  registration_status text;
  department uuid;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'officer activation is forbidden';
  end if;

  select id into target_id
  from public.profiles
  where lower(email) = lower(btrim(target_email));

  select status into registration_status
  from public.officer_registrations
  where user_id = target_id;

  if target_id is null or registration_status is distinct from 'pending' then
    raise exception 'officer registration is not pending';
  end if;

  select id into department
  from public.departments
  where code = btrim(department_code);

  if department is null then
    raise exception 'department is not recorded';
  end if;

  perform set_config('udyamsetu.officer_activation', 'allowed', true);

  update public.profiles
  set role = 'officer'
  where id = target_id
    and role = 'applicant';

  if not found then
    raise exception 'officer registration is not pending';
  end if;

  insert into public.officer_departments (user_id, department_id)
  values (target_id, department)
  on conflict (user_id, department_id) do nothing;

  update public.officer_registrations
  set
    status = 'active',
    department_id = department,
    activated_at = now(),
    activated_by = auth.uid()
  where user_id = target_id
    and status = 'pending';
end;
$$;

revoke all on function public.activate_officer_registration(text, text) from public, anon;
grant execute on function public.activate_officer_registration(text, text) to authenticated;
