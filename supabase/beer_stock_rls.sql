-- RLS for public.beer_stock (run after supabase/beer_stock_schema.sql and supabase/rls_policies.sql)
-- Mirrored in supabase/migrations/20250405120002_beer_stock_rls.sql

alter table public.beer_stock enable row level security;

drop policy if exists "beer_stock_select_available" on public.beer_stock;
create policy "beer_stock_select_available"
  on public.beer_stock
  for select
  to authenticated
  using (is_unavailable = false);

drop policy if exists "beer_stock_select_manager" on public.beer_stock;
create policy "beer_stock_select_manager"
  on public.beer_stock
  for select
  to authenticated
  using (public.is_manager());

drop policy if exists "beer_stock_insert_manager" on public.beer_stock;
create policy "beer_stock_insert_manager"
  on public.beer_stock
  for insert
  to authenticated
  with check (public.is_manager());

drop policy if exists "beer_stock_update_manager" on public.beer_stock;
create policy "beer_stock_update_manager"
  on public.beer_stock
  for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

drop policy if exists "beer_stock_delete_manager" on public.beer_stock;
create policy "beer_stock_delete_manager"
  on public.beer_stock
  for delete
  to authenticated
  using (public.is_manager());
