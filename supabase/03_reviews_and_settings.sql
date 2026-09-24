-- Run this in the Supabase SQL Editor after 01_schema.sql and 02_security.sql
-- if you're setting up a fresh project. (On the project already connected to
-- this site, this has already been applied.)

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

-- Store settings (single row: tax rate + delivery config)
create table public.settings (
  id boolean primary key default true check (id),
  tax_rate numeric not null default 0,
  delivery_mode text not null default 'flat' check (delivery_mode in ('free', 'flat')),
  delivery_charge numeric not null default 200,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true);

alter table public.reviews enable row level security;
alter table public.settings enable row level security;

create policy "Anyone can view reviews"
  on public.reviews for select
  using (true);

create policy "Signed-in users can post their own review"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Admins can delete reviews"
  on public.reviews for delete
  using (public.is_admin());

create policy "Anyone can view settings"
  on public.settings for select
  using (true);

create policy "Admins can update settings"
  on public.settings for update
  using (public.is_admin());
