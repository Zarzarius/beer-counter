-- Row Level Security for Beer Tab (profiles, beers)
-- Safe to re-run: policies are dropped/recreated.
-- Mirrored in supabase/migrations/20250405120000_profiles_beers_rls.sql for Supabase CLI.
--
-- Also run supabase/beer_stock_rls.sql after supabase/beer_stock_schema.sql if you use the catalog table.

-- ---------------------------------------------------------------------------
-- Core tables (skip if you already created them in the dashboard)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'manager'))
);

create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.beers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists beers_user_id_created_at_idx on public.beers (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  );
$$;

grant execute on function public.is_manager() to authenticated;

-- Prevent privilege escalation via API (role must stay fixed after insert)
create or replace function public.enforce_profile_role_unchanged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Changing profile role is not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role_unchanged on public.profiles;
create trigger enforce_profile_role_unchanged
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_unchanged();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_select_customers_as_manager" on public.profiles;
create policy "profiles_select_customers_as_manager"
  on public.profiles
  for select
  to authenticated
  using (public.is_manager() and role = 'customer');

drop policy if exists "profiles_insert_own_customer" on public.profiles;
create policy "profiles_insert_own_customer"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role = 'customer');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- beers
-- ---------------------------------------------------------------------------

alter table public.beers enable row level security;

drop policy if exists "beers_select_own" on public.beers;
create policy "beers_select_own"
  on public.beers
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "beers_select_manager" on public.beers;
create policy "beers_select_manager"
  on public.beers
  for select
  to authenticated
  using (public.is_manager());

drop policy if exists "beers_insert_own" on public.beers;
create policy "beers_insert_own"
  on public.beers
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "beers_update_own" on public.beers;
create policy "beers_update_own"
  on public.beers
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "beers_update_manager" on public.beers;
create policy "beers_update_manager"
  on public.beers
  for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

drop policy if exists "beers_delete_own" on public.beers;
create policy "beers_delete_own"
  on public.beers
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "beers_delete_manager" on public.beers;
create policy "beers_delete_manager"
  on public.beers
  for delete
  to authenticated
  using (public.is_manager());
