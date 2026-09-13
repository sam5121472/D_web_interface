-- ============================================
-- DARK ELIXIR — Supabase schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Profiles: extends Supabase's built-in auth.users with our own fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Products
create table public.products (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  price_value numeric not null check (price_value >= 0),
  category text not null,
  image_url text not null,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

-- Orders
create table public.orders (
  id text primary key,                 -- e.g. 'DE-482913'
  user_id uuid references auth.users(id),
  items jsonb not null,                -- [{product_id, title, qty, line_total}, ...]
  address jsonb not null,
  payment_method text,
  transaction_id text,
  subtotal numeric not null,
  discount numeric not null default 0,
  promo_code text,
  total numeric not null,
  status text not null default 'Processing' check (status in ('Processing', 'Shipped', 'Delivered')),
  created_at timestamptz not null default now()
);

-- Promo codes
create table public.promo_codes (
  code text primary key,
  type text not null check (type in ('percentage', 'flat')),
  value numeric not null check (value > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Customer'), 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
