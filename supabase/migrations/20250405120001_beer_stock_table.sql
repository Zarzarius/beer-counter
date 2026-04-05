-- Optional beer_stock catalog (requires 20250405120000_profiles_beers_rls.sql for is_manager)

create table if not exists public.beer_stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brewery text not null,
  style text not null,
  year text,
  abv numeric,
  description text,
  is_unavailable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beer_stock_name_brewery_style_idx
  on public.beer_stock (name, brewery, style);

create or replace view public.beer_stock_available as
select *
from public.beer_stock
where is_unavailable = false;
