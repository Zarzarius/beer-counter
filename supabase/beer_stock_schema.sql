-- Beer stock/catalog table schema for manager-controlled beers
-- Apply this in your Supabase SQL editor or migrations system.

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

-- Simple index to speed up name/brewery/style search.
-- Note: This uses a standard btree index for portability across environments.
create index if not exists beer_stock_name_brewery_style_idx
  on public.beer_stock (name, brewery, style);

-- Optional helper: view only currently available beers
create or replace view public.beer_stock_available as
select *
from public.beer_stock
where is_unavailable = false;

