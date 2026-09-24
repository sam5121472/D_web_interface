# Dark Elixir

A premium, editorial-style e-commerce storefront for Dark Elixir (Himalayan shilajit and sea buckthorn) — plain HTML/CSS/vanilla JavaScript on the front end, with a real **Supabase** backend (Postgres database, Auth, and file storage) handling everything that used to live in `localStorage`.

## What's included

- Sticky nav, hero, brand story, and sourcing sections
- Filterable product catalog, priced in **PKR**, stored in a Postgres `products` table — admins can add, edit, and remove products from the Admin Dashboard, and **filter-pill categories are generated automatically** from whatever categories exist in the database. Type a brand-new category when adding a product and a new storefront section appears immediately; remove the last product in a category and its pill disappears — no code edits required.
- Product photos can be uploaded straight from the Admin Dashboard (stored in a public Supabase Storage bucket) or linked by URL
- Shopping cart drawer + two-step checkout with a **sandbox** Pakistani payment flow (card, JazzCash, Easypaisa, Raast — no real gateway or payment credentials are wired in), a database-backed promo/discount code system, and configurable **tax** and **delivery charges** (or free delivery) set from the Admin Dashboard and stored in the database
- Real user accounts via **Supabase Auth** (email + password) with an order-history dashboard, backed by real password hashing and real sessions — not a browser-side placeholder
- Admin dashboard (sales metrics, order status management, inventory editing, product create/delete, promo code management, delivery & tax settings) — gated by a `role` column enforced with **Postgres Row Level Security**, not just hidden in the browser
- Product detail view with star-rating **customer reviews** (average rating badge, review list, submission form for signed-in users, stored in the database) and a category-based "Recommended for You" panel
- Contact section and a Lab Certified section ready for you to drop in a real test certificate
- Full mobile responsiveness pass, scroll-reveal animations, and a looping background hero video with a `prefers-reduced-motion` fallback

## Backend architecture (Supabase)

Everything the storefront reads or writes goes through Supabase:

| Data | Table | Who can write |
|---|---|---|
| Products | `products` | Admins only |
| Orders | `orders` | Customers create their own; only admins can change status |
| Promo codes | `promo_codes` | Admins only |
| Reviews | `reviews` | Any signed-in user, on their own review |
| Tax/delivery | `settings` (single row) | Admins only |
| User profile + role | `profiles` (1:1 with `auth.users`) | Users edit their own name; role is admin-only |

Every rule above is enforced by **Row Level Security policies in Postgres** (see `/supabase/*.sql`), which means the "admin" gate is a real server-side check, not something a person could bypass by editing this site's JavaScript in their browser's dev tools.

Product photos go in a public Supabase Storage bucket called `product-images`; anyone can view them, only admins can upload/replace/delete.

## Project structure

```
dark-elixir/
├── index.html                 # Page markup
├── css/
│   └── styles.css             # All styles (design tokens, layout, components)
├── js/
│   ├── supabase-client.js     # Supabase project URL + anon key, shared client
│   ├── nav.js                 # Sticky nav + mobile menu
│   ├── products.js            # Product catalog: loads from Supabase, renders, dynamic category filters
│   ├── promo.js               # Promo code lookup/creation (Supabase)
│   ├── settings.js            # Tax/delivery settings (Supabase)
│   ├── cart-checkout.js       # Cart drawer, checkout flow, sandbox payment, order insert
│   ├── account.js             # Supabase Auth sign up/in/out, customer dashboard, order history
│   ├── admin.js                # Admin dashboard: metrics, orders, inventory, promo codes, settings, image upload
│   ├── reviews.js              # Review read/write (Supabase)
│   ├── product-detail.js       # Product detail view + recommendations + review UI
│   └── app-init.js             # Loads session + settings once on page load, syncs nav on auth changes
├── supabase/
│   ├── 01_schema.sql            # Tables: profiles, products, orders, promo_codes
│   ├── 02_security.sql          # Row Level Security policies + is_admin() helper
│   ├── 03_reviews_and_settings.sql  # reviews + settings tables/policies
│   └── 04_storage.sql           # product-images storage bucket + policies
├── assets/
│   └── images/                  # Product, process, and brand photography
├── vercel.json
└── .gitignore
```

Scripts are loaded in the order shown in `index.html` via plain `<script src>` tags (no bundler, no ES modules) — `supabase-client.js` must load before every other app script, and `app-init.js` must load last.

## Running locally

No build step needed. Any static file server works:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL. The site talks to the live Supabase project configured in `js/supabase-client.js`, so you'll see real, shared data even when running locally.

## The Supabase project

This site is wired to a Supabase project called **"Dark Elixir"** (ref `viqequtaazonfywilqvh`) in your account. The `supabase/*.sql` files are already applied there — they're kept in the repo so you can recreate the schema on a different project if you ever need to (Supabase → SQL Editor → paste each file in order, 01 through 04).

**Free-tier note:** Supabase pauses inactive free projects after about a week of no API traffic. If the storefront suddenly can't load products, go to your Supabase dashboard and click "Restore project" — it takes a minute or two, no data is lost.

## Admin account

| Role  | Email                  | Password  |
|-------|-------------------------|-----------|
| Admin | samzyhassan7@gmail.com  | admin123  |

Sign in with this account to see the "Admin" link appear in the nav. **Change this password immediately** — Account → Account Settings (any signed-in user, including the admin, can update their own name and password there).

To promote a different account to admin later (e.g. after a manager signs up normally through the site), run this once in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'their-email@example.com');
```

Everyone who signs up through the site starts as a regular `customer` — this is intentional, so random sign-ups can never grant themselves admin access.

## Test promo codes (seeded)

| Code        | Type       | Value    | Status   |
|-------------|------------|----------|----------|
| WELCOME10   | Percentage | 10%      | Active   |
| FLAT500     | Flat       | Rs. 500  | Active   |
| OLDPROMO    | Percentage | 15%      | Inactive (won't apply — demonstrates the admin toggle) |

Enter a code in the Promo Code field in the cart drawer or on Step 2 of checkout. Admins can create new codes or flip a code's Active status from the Promo Codes panel in the Admin Dashboard.

## Delivery & tax

Default settings on first load: a flat **Rs. 200** delivery charge and **0% tax**, stored in the `settings` table. Change either (or switch to free delivery) from the **Delivery & Tax** panel in the Admin Dashboard — Step 2 of checkout recalculates the total live.

## Adding new products & sections

From the Admin Dashboard → Inventory panel:
- **New category / section**: in the "Add Product" form, type a category name that doesn't exist yet (instead of picking an existing one). Saving the product creates that category, and a matching filter pill appears on the storefront immediately — no code changes needed.
- **Photos**: use the file upload field to store the photo in Supabase (recommended), or paste an image URL if you'd rather host it elsewhere.
- **Editing price/stock**: adjust the fields directly in the Inventory list and click Save.
- **Removing a product**: click Remove in the Inventory list. If it was the last product in its category, that category's filter pill disappears from the storefront automatically.

## Reviews

Product detail pages show a star rating average and a list of reviews from the `reviews` table. Anyone signed in can leave a rating + comment on any product — there's currently no purchase-verification check, which you could add later as a policy that checks the `orders` table.

## Deploying — GitHub + Vercel

This repo is already connected: `https://github.com/sam5121472/D_web_interface` → Vercel project `d-web-interface`. To ship these changes:

```bash
git add .
git commit -m "Connect backend to Supabase"
git push
```

Vercel redeploys automatically on every push to `main`. No environment variables are needed — the Supabase URL and anon key are public by design (see `js/supabase-client.js`) and access is controlled entirely by Row Level Security on the database side.

## Known limitations (read before going further)

- **Payments**: the checkout's card/JazzCash/Easypaisa/Raast flow is still a sandbox simulation. No real gateway, merchant ID, or API key is wired in. The discounted total (after any promo code, tax, and delivery) is what gets passed to the sandbox charge function, so the amount shown is correct even though the gateway call itself is simulated. Real integration needs a server (e.g. a Supabase Edge Function) to hold merchant credentials and sign requests — happy to help wire this up next if you want real payments.
- **"Recommended for You"**: this is still a rule-based category matcher (same-category first, cross-category fallback), not a live AI/LLM call.
- **Contact & social links / Lab Certified section**: still placeholders — search `index.html` for `mailto:`, `tel:`, `instagram.com`, `facebook.com`, `linkedin.com`, and `id="lab-certified"` to swap in your real details.
- **Category name matching is case-sensitive**: "Shilajit" and "shilajit" would currently be treated as two different categories. Keep casing consistent when typing a category name, or ask for a normalization step to be added.
- **Email confirmation**: if your Supabase project has "Confirm email" turned on (the default), new sign-ups need to click a confirmation link before they can sign in. You can turn this off in Supabase → Authentication → Providers → Email if you'd rather let people shop immediately after signing up.
