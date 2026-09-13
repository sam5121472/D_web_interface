-- ============================================
-- DARK ELIXIR — Row Level Security (RLS)
-- Run this AFTER 01_schema.sql, also in the SQL Editor
-- This is what makes the database actually enforce "only admins can
-- see all orders" / "customers can only see their own" — for real,
-- on the server, not just hidden by the front-end.
-- ============================================

-- Helper: is the currently logged-in user an admin?
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Turn on RLS for every table (locked down by default until we add policies)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.promo_codes enable row level security;

-- ---------- PROFILES ----------
create policy "View own profile or admin views all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- PRODUCTS ----------
-- Public storefront: anyone (even logged out) can view products
create policy "Anyone can view products"
  on public.products for select
  using (true);

create policy "Admins can add products"
  on public.products for insert
  with check (public.is_admin());

create policy "Admins can edit products"
  on public.products for update
  using (public.is_admin());

create policy "Admins can delete products"
  on public.products for delete
  using (public.is_admin());

-- ---------- ORDERS ----------
create policy "Users view own orders, admins view all"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Admins can update order status"
  on public.orders for update
  using (public.is_admin());

-- ---------- PROMO CODES ----------
create policy "Anyone can view active codes"
  on public.promo_codes for select
  using (active = true or public.is_admin());

create policy "Admins can create promo codes"
  on public.promo_codes for insert
  with check (public.is_admin());

create policy "Admins can update promo codes"
  on public.promo_codes for update
  using (public.is_admin());
