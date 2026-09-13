# Dark Elixir

A premium, editorial-style e-commerce storefront for Dark Elixir (Himalayan shilajit and sea buckthorn), built as a static site — plain HTML, CSS, and vanilla JavaScript, no build step or framework required.

## What's included

- Sticky nav, hero, brand story, and sourcing sections
- Filterable product catalog, priced in **PKR**, with a persisted (localStorage) inventory store — admins can add and remove products directly from the Admin Dashboard
- Shopping cart drawer + two-step checkout with a **sandbox** Pakistani payment flow (card, JazzCash, Easypaisa, Raast — no real gateway or payment credentials are wired in), a promo/discount code system, and configurable **tax** and **delivery charges** (or free delivery) set from the Admin Dashboard
- Client-side user accounts (sign up / sign in) with an order-history dashboard
- Admin dashboard (sales metrics, order status management, inventory editing, product create/delete, promo code management, delivery & tax settings) — gated behind an `admin` role
- Product detail view with star-rating **customer reviews** (average rating badge, review list, and a submission form for signed-in users) and a category-based "Recommended for You" panel
- Contact section (email, phone/WhatsApp, Instagram, Facebook, LinkedIn) and a Lab Certified section ready for you to drop in a real test certificate — see the HTML comments above each section in `index.html` for exactly which placeholder values/images to swap
- A full mobile responsiveness pass, including a fixed mobile-nav overlap bug: every multi-column layout collapses to a clean vertical stack on small screens, the desktop nav becomes a hamburger slide-out menu below 980px, interactive controls meet a 44px minimum touch target, and typography/spacing scale smoothly from ~360px phones through tablet and desktop widths
- A muted, looping background video in the hero section (`assets/video/hero-bg.mp4`), with a poster-frame fallback image and a `prefers-reduced-motion` guard that keeps the hero on a static frame for users who've asked their OS for less motion
- Scroll-reveal animations on section content and staggered fade-ins on dynamically-rendered product/recommendation cards, plus smoother hover/press transitions on primary buttons and cards

**Important:** everything above runs entirely in the browser using `localStorage`. There is no backend, no database, and no real payment or AI integration. This is a front-end foundation meant to be wired up to real services later — see "Known limitations" below before using it for anything beyond a demo.

## Project structure

```
dark-elixir/
├── index.html              # Page markup
├── css/
│   └── styles.css          # All styles (design tokens, layout, components)
├── js/
│   ├── nav.js               # Sticky nav + mobile menu
│   ├── products.js          # Product catalog data + rendering + filters
│   ├── cart-checkout.js     # Cart drawer, checkout flow, sandbox payment
│   ├── account.js           # Sign up / sign in, customer dashboard
│   ├── admin.js              # Admin dashboard (metrics, orders, inventory)
│   └── product-detail.js     # Product detail view + recommendations
├── assets/
│   └── images/               # Product, process, and brand photography
├── vercel.json
└── .gitignore
```

Scripts are loaded in the order above via plain `<script src>` tags (no bundler, no ES modules), so that order matters if you edit `index.html`.

## Running locally

No build step needed. Any static file server works, for example:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL in your browser. (Opening `index.html` directly via `file://` also works, but a local server is closer to how it behaves once deployed.)

## Test accounts (seeded on first load)

| Role     | Email                  | Password     |
|----------|-------------------------|--------------|
| Admin    | samzyhassan7@gmail.com  | admin123     |
| Customer | ayesha@example.com      | password123  |
| Customer | bilal@example.com       | password123  |
| Customer | fatima@example.com      | password123  |

Sign in as the admin account to see the "Admin" link appear in the nav. Change the default `admin123` password immediately after your first login — go to Account → Account Settings, where any signed-in user (including the admin) can update their name and password.

## Test promo codes (seeded on first load)

| Code        | Type       | Value    | Status   |
|-------------|------------|----------|----------|
| WELCOME10   | Percentage | 10%      | Active   |
| FLAT500     | Flat       | Rs. 500  | Active   |
| OLDPROMO    | Percentage | 15%      | Inactive (won't apply — demonstrates the admin toggle) |

Enter a code in the Promo Code field in the cart drawer or on Step 2 of checkout. Admins can create new codes or flip a code's Active status from the Promo Codes panel in the Admin Dashboard.

## Delivery & tax

Default settings on first load: a flat **Rs. 200** delivery charge and **0% tax**. Change either (or switch to free delivery) from the **Delivery & Tax** panel in the Admin Dashboard — Step 2 of checkout recalculates the total live.

## Reviews

Product detail pages show a star rating average and a list of reviews, seeded with a handful of realistic ones. Anyone signed in can leave a rating + comment on any product — there's currently no purchase-verification check, which a real backend would typically add.

## Deploying — GitHub + Vercel

1. **Push this project to GitHub**
   ```bash
   cd dark-elixir
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. **Import into Vercel**
   - Go to [vercel.com/new](https://vercel.com/new) and sign in (GitHub login is easiest).
   - Click **Import** next to the repository you just pushed.
   - Framework Preset: choose **"Other"** (or leave it on auto-detect — there's no build step, Vercel will serve the static files as-is).
   - Leave the Build Command and Output Directory blank — nothing to build.
   - Click **Deploy**.

3. Vercel will give you a live `*.vercel.app` URL within a few seconds. Every future `git push` to `main` redeploys automatically.

No environment variables are required for anything currently in the project, since there's no real backend or API integration yet.

## Known limitations (read before going further)

This was built in stages as a front-end foundation, and several features are explicitly **sandboxed/simulated** rather than production-ready:

- **Contact & social links**: the email, phone number, and Instagram/Facebook/LinkedIn links in the Contact section and footer are placeholders (`hello@darkelixir.com`, `+92 300 1234567`, `@darkelixir`, etc.). Replace them with your real details before launch — search `index.html` for `mailto:`, `tel:`, `instagram.com`, `facebook.com`, and `linkedin.com` to find every spot.
- **Lab Certified section**: currently shows a "Pending Upload" placeholder. Once you have a real certificate, replace the placeholder block in `index.html` (search for `id="lab-certified"`) with an image or a link to the PDF.

- **Payments**: the checkout's card/JazzCash/Easypaisa/Raast flow is a sandbox simulation. No real gateway, merchant ID, or API key is used — including Stripe, which was requested at one point but isn't actually wired in for the same reason (a static file has nowhere secure to hold a secret key). The discounted total (after any promo code) is what gets passed to the sandbox charge function, so the amount is correct even though the gateway call itself is simulated. Real integration needs a backend to hold merchant credentials and sign requests server-side.
- **Auth & passwords**: accounts, sessions, and passwords all live in `localStorage` and use a non-cryptographic placeholder hash. This is fine for a demo, not for real user data. A production build needs a real backend with proper password hashing (bcrypt/Argon2) and server-side session/authorization checks.
- **Admin access control**: the Admin dashboard is gated by a `role` field checked in the browser. Someone editing their own browser's JavaScript could bypass this. Real access control must be enforced server-side, not just in the page's JS.
- **"Recommended for You"**: this is a rule-based category matcher (same-category first, cross-category fallback), not a live AI/LLM call — there's nowhere secure to hold a model API key in a static file.

If/when you're ready to make any of these real, the natural next step is a small backend (serverless functions work well on Vercel) to hold secrets and do the parts that shouldn't happen in the browser.
