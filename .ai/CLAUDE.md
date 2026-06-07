# Restaurant Ordering System — Claude Context

## Project Overview
A production-ready single-restaurant ordering system built with Next.js, Supabase, and Stripe.
Single restaurant, no multi-tenancy. Australian market (AUD, GST-inclusive pricing).

## Stack
- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe Checkout + Webhooks
- **State**: Zustand (cart, persisted to localStorage)
- **Icons**: lucide-react
- **Utilities**: clsx
- **Hosting**: Vercel (planned)

---

## Project Structure
```
app/
  page.tsx                  → redirects to /menu
  menu/page.tsx             → server component, fetches menu from Supabase (revalidate 60s)
  checkout/page.tsx         → cart review + quantity controls + Stripe redirect
  checkout/success/page.tsx → post-payment confirmation page
  account/page.tsx          → order history + loyalty points (auth required, server redirect)
  login/page.tsx            → Supabase email/password login
  signup/page.tsx           → account creation with full_name
  admin/                    → admin dashboard (Phase 5 — NOT YET BUILT)
  api/
    checkout/route.ts       → POST: validates cart against DB prices, creates Stripe Checkout Session
    webhooks/stripe/route.ts→ POST: handles checkout.session.completed + charge.refunded
    auth/signout/route.ts   → POST: signs user out, redirects to /menu

components/
  ui/Navbar.tsx             → sticky navbar with live cart badge (Zustand)
  menu/MenuClient.tsx       → category filter tabs + items grid (client component)
  menu/MenuItemCard.tsx     → item card: modifiers toggle, quantity selector, add to cart

lib/
  supabase/
    client.ts               → createClient() — browser Supabase client (use in 'use client' components)
    server.ts               → createClient() async — server Supabase client (Server Components, Route Handlers)
                               createServiceClient() — service role, bypasses RLS (webhook/admin API only)
    middleware.ts           → updateSession() — refreshes auth token + protects /admin routes
    types.ts                → full TypeScript Database generic type (all tables, Relationships, Functions)
  stripe/
    client.ts               → singleton Stripe client (apiVersion: 2026-05-27.dahlia)
    types.ts                → CartItem, CartModifier, CheckoutRequest interfaces
  store/
    cart.ts                 → Zustand cart store persisted to localStorage
                               methods: addItem, removeItem, updateQuantity, clearCart, totalCents, totalItems
                               cart item ID = menu_item_id + sorted modifier IDs (deduplication key)
  utils.ts                  → formatPrice(cents) → "$0.00"
                               gstAmount(cents) → GST component (inclusive 10%)
                               exGst(cents) → ex-GST amount
                               cn(...) → clsx className helper

supabase/
  migrations/
    20240001_initial_schema.sql   → all 8 tables + indexes + handle_new_user() trigger
    20240002_rls_policies.sql     → RLS enabled on all tables + is_admin() SECURITY DEFINER function
    20240003_seed_data.sql        → sample menu: 5 categories, 12 items, modifiers on burger + fries
    20240004_loyalty_rpc.sql      → increment_loyalty_points(p_user_id, p_points) — atomic upsert, floors at 0
    20240005_refund_support.sql   → adds 'refunded' to payment_status constraint + stripe_payment_intent_id column
  config.toml               → local Supabase CLI config (port 54321, auth site_url localhost:3000)
```

---

## Database Tables

| Table | Key Columns | Notes |
|---|---|---|
| `profiles` | `id`, `email`, `full_name`, `is_admin` | Auto-created via trigger on auth.users insert |
| `menu_categories` | `name`, `sort_order`, `is_active` | RLS: public read active only, admin write |
| `menu_items` | `category_id`, `name`, `description`, `price_cents`, `image_url`, `is_available`, `sort_order` | price_cents = integer, never float |
| `menu_item_modifiers` | `menu_item_id`, `name`, `price_cents`, `is_available` | Add-ons per item |
| `orders` | `user_id` (nullable), `items` (jsonb), `total_amount`, `payment_status`, `order_status`, `stripe_session_id` (UNIQUE), `stripe_payment_intent_id`, `customer_email` | Created ONLY in webhook after payment |
| `order_items` | `order_id`, `menu_item_id`, `name`, `quantity`, `unit_price`, `modifiers` (jsonb) | Denormalized price+name snapshot at order time |
| `loyalty_accounts` | `user_id` (PK), `total_points`, `updated_at` | Cached balance — source of truth is loyalty_transactions |
| `loyalty_transactions` | `user_id`, `order_id`, `points`, `type` (earn/redeem/adjustment), `note` | Full ledger — never delete rows |
| `email_logs` | `user_id`, `order_id`, `to_email`, `type`, `status` (pending/sent/failed), `error` | Written in webhook; processed in Phase 6 email sender |

---

## Key Rules (NEVER VIOLATE)
1. **Prices always in cents** — `price_cents` is always an integer. Never store or pass floats. Divide by 100 only for display via `formatPrice()`.
2. **Orders created ONLY in webhook** — the `/api/checkout` route only creates a Stripe session. The order row is inserted in `/api/webhooks/stripe` after `checkout.session.completed` with `payment_status === 'paid'`.
3. **Service role client only in server-side API routes** — `createServiceClient()` bypasses RLS. Never import in client components or expose the service role key to the browser.
4. **Idempotency** — before inserting an order, always check `stripe_session_id` uniqueness. Stripe can fire the same webhook multiple times.
5. **GST is inclusive** — 10% GST baked into all `price_cents`. Never add GST on top. Use `exGst()` and `gstAmount()` for display breakdown only.
6. **RLS is always on** — all tables have RLS enabled. Use `is_admin()` DB function in policies. Never disable RLS in production.
7. **Cart is client-side only** — Zustand + localStorage. Server never trusts client prices — always re-fetches from DB in `/api/checkout`.
8. **Loyalty only for logged-in users** — guests (`user_id = null`) do not earn points. Check `userId` before calling `awardLoyaltyPoints()`.
9. **Never go below 0 loyalty points** — `increment_loyalty_points()` uses `GREATEST(0, ...)` to floor at zero.
10. **Email logs are append-only** — always INSERT new rows, never UPDATE existing email_logs rows except to set `status` and `error`.

---

## Stripe Webhook Events Handled

| Event | Handler | Actions |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutComplete()` | 1. Idempotency check 2. INSERT order 3. INSERT order_items 4. awardLoyaltyPoints (if user) 5. logEmail(order_created) |
| `charge.refunded` | `handleRefund()` | 1. Find order by stripe_payment_intent_id 2. UPDATE payment_status=refunded, order_status=cancelled 3. reverseLoyaltyPoints (if user) 4. logEmail(order_cancelled) |

Webhook returns HTTP 200 always (even on handler error) to prevent Stripe infinite retries.
Signature verified via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   ← NEVER expose to browser

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...                      ← NEVER expose to browser
STRIPE_WEBHOOK_SECRET=whsec_...                    ← from stripe listen output

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000           ← used in Stripe success/cancel URLs

# Email (Phase 6)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourrestaurant.com
```

---

## Development Workflow

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Stripe CLI webhook forwarding (copy whsec_ into .env.local)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3 — trigger a synthetic test event
stripe trigger checkout.session.completed

# Replay a real event by ID (from Stripe dashboard → Developers → Events)
stripe events resend evt_xxxxx

# Type check
npx tsc --noEmit

# Build check
npm run build
```

---

## Completed Phases

### ✅ Phase 1 — System Design
- Architecture diagram, database schema, Stripe flow, event system design

### ✅ Phase 2 — Supabase Setup
- All 8 tables created with correct types, constraints, indexes
- RLS enabled on all tables with `is_admin()` helper function
- Auto-profile creation trigger on auth.users
- Seed data: 5 categories, 12 menu items, modifiers on cheeseburger and fries
- `increment_loyalty_points()` RPC function (atomic, floors at 0)
- Refund support: `stripe_payment_intent_id` column, `refunded` payment status

### ✅ Phase 3 — Stripe Integration
- `/api/checkout` — re-validates all prices from DB, creates Stripe Checkout Session (AUD)
- `/api/webhooks/stripe` — verifies signature, handles checkout.session.completed + charge.refunded
- Idempotency via UNIQUE stripe_session_id
- Loyalty awarded on payment, reversed on refund
- Email log entry queued on both events
- Stripe CLI used for local webhook forwarding

### ✅ Phase 4 — Next.js Frontend
- `/menu` — server-rendered, category filter tabs, item cards with modifiers + quantity
- `/checkout` — cart review, quantity controls, GST breakdown, Stripe redirect
- `/checkout/success` — confirmation page
- `/account` — order history with status badges, loyalty points display (auth required)
- `/login` + `/signup` — Supabase email/password auth
- Navbar with live cart item count badge
- Cart persisted to localStorage via Zustand
- GST breakdown: subtotal (ex. GST) + GST (10%) + Total (inc. GST)

---

## Pending Phases (DETAILED)

### 🔲 Phase 5 — Admin Dashboard (`/admin`)

**Route structure to build:**
```
app/admin/
  layout.tsx              → shared admin layout with sidebar nav
  page.tsx                → redirect to /admin/orders
  orders/
    page.tsx              → orders list with filters (status, date range, search)
    [id]/page.tsx         → single order detail view with status update
  menu/
    page.tsx              → list all categories + items
    categories/
      new/page.tsx        → create category form
      [id]/edit/page.tsx  → edit category form
    items/
      new/page.tsx        → create menu item form (with modifiers)
      [id]/edit/page.tsx  → edit menu item + modifiers
  loyalty/
    page.tsx              → user loyalty balances table
    [userId]/page.tsx     → user transaction history + manual adjustment form
  analytics/
    page.tsx              → analytics dashboard
```

**Orders management:**
- Table view: id, customer email, items summary, total, payment_status, order_status, created_at
- Filter by: order_status (placed/completed/cancelled), payment_status (paid/refunded), date range
- Search by: customer email, order ID
- Per-order actions: mark as completed, mark as cancelled
- Order detail page: full item list with modifiers, loyalty earned, email log status
- Pagination (20 per page)

**Menu management:**
- Category CRUD: name, sort_order, is_active toggle
- Item CRUD: name, description, price_cents (input as dollars, store as cents), image_url, is_available toggle, sort_order, category assignment
- Modifier CRUD per item: name, price_cents, is_available
- Inline editing preferred over separate pages where possible
- Validation: price must be > 0, name required, category required

**Loyalty system:**
- Table: user email, full_name, total_points, last transaction date
- Per-user: full transaction history (earn/redeem/adjustment), order links
- Manual adjustment form: points amount (positive or negative), note/reason
- Uses `increment_loyalty_points()` RPC + inserts loyalty_transaction with type='adjustment'

**Analytics dashboard:**
- Revenue section:
  - Total revenue (sum of orders.total_amount WHERE payment_status='paid')
  - Revenue by day/week/month (line chart) — use orders.created_at
  - Average order value (total_revenue / order_count)
  - Refund rate (refunded orders / paid orders)
- Product section:
  - Top selling items by quantity (JOIN order_items GROUP BY name ORDER BY SUM(quantity))
  - Top selling items by revenue (SUM(unit_price * quantity))
  - Category performance breakdown
- Customer section:
  - Total unique customers (COUNT DISTINCT user_id WHERE NOT NULL)
  - New vs returning (first order vs subsequent)
  - Average spend per customer
  - Top customers by spend
- Operational section:
  - Order volume by day (bar chart)
  - Cancellation rate
  - Orders by status breakdown (pie/donut)
- Charts: use a lightweight library (recharts recommended — install in Phase 5)
- All analytics queries use service role client, server components only

**Admin layout/sidebar:**
- Links: Orders, Menu, Loyalty, Analytics
- Show logged-in admin name
- Breadcrumbs on nested pages
- Protected by middleware (is_admin check already in lib/supabase/middleware.ts)

**New API routes needed:**
```
app/api/admin/
  orders/[id]/route.ts        → PATCH: update order_status
  menu/categories/route.ts    → GET all, POST create
  menu/categories/[id]/route.ts → PATCH update, DELETE
  menu/items/route.ts         → GET all, POST create
  menu/items/[id]/route.ts    → PATCH update, DELETE
  menu/modifiers/route.ts     → POST create
  menu/modifiers/[id]/route.ts→ PATCH update, DELETE
  loyalty/[userId]/adjust/route.ts → POST: manual adjustment
```

**New components needed:**
```
components/admin/
  Sidebar.tsx
  OrdersTable.tsx
  OrderDetail.tsx
  MenuItemForm.tsx
  CategoryForm.tsx
  ModifierList.tsx
  LoyaltyTable.tsx
  AdjustmentForm.tsx
  analytics/
    RevenueChart.tsx
    TopItemsChart.tsx
    OrderVolumeChart.tsx
    StatCard.tsx
```

---

### 🔲 Phase 6 — Email System

**Email provider:** Resend (https://resend.com) — `npm install resend`

**Email trigger flow:**
- Emails are NOT sent in the webhook directly (webhook must return fast)
- Instead: webhook writes to `email_logs` with `status='pending'`
- A separate API route or cron job reads pending logs and sends them
- After sending: UPDATE email_logs SET status='sent' (or 'failed' + error message)

**Implementation options (choose one):**
1. **Vercel Cron** — `app/api/cron/send-emails/route.ts` runs every minute via vercel.json cron
2. **Send inline in webhook** — simpler, acceptable if Resend is fast (usually <200ms)
   - Recommended for MVP: send inline, add timeout protection

**Email types to implement:**

| Type | Trigger | Content |
|---|---|---|
| `order_created` | checkout.session.completed | Order confirmation: items list, total, GST breakdown, order ID |
| `payment_success` | checkout.session.completed | Payment receipt with Stripe payment reference |
| `order_completed` | Admin marks order as completed | "Your order is ready" notification + loyalty points earned |
| `order_cancelled` | charge.refunded OR admin cancels | Cancellation notice + refund amount + loyalty points reversed |

**File structure to build:**
```
lib/email/
  client.ts           → Resend client singleton
  sender.ts           → sendEmail(log: EmailLog) dispatcher
  templates/
    order-created.tsx → React Email template
    payment-success.tsx
    order-completed.tsx
    order-cancelled.tsx

app/api/
  cron/send-emails/route.ts  → reads pending email_logs, sends, updates status
```

**React Email templates:**
- Use `@react-email/components` package for HTML email templates
- Install: `npm install @react-email/components react-email`
- Templates should include: restaurant name/logo, order items table, total with GST breakdown, loyalty points (if applicable), footer with contact info
- Test with: `npx react-email dev` (preview server on port 3000)

**Resend setup:**
- Sign up at resend.com, verify domain, get API key
- Add sending domain (or use onboarding@resend.dev for testing)
- Set `RESEND_API_KEY` and `EMAIL_FROM` env vars

**New migration needed:**
- No schema changes — `email_logs` table already exists from Phase 2

---

### 🔲 Phase 7 — CI/CD Pipeline

**Branch strategy:**
- `main` → production (Vercel production deployment)
- `dev` → staging (Vercel preview deployment)
- `feature/*` → development (no auto-deploy)

**GitHub Actions workflows to create:**

```
.github/workflows/
  ci.yml      → runs on every PR and push to main/dev
  deploy.yml  → runs on merge to main (production deployment)
```

**CI workflow (`ci.yml`) — must ALL pass before merge:**
```yaml
jobs:
  quality:
    - TypeScript type check: npx tsc --noEmit
    - ESLint: npm run lint
    - Next.js build: npm run build
    - (future) unit tests: npm test
```

**CD workflow — on merge to main:**
```yaml
jobs:
  deploy:
    - Vercel deployment via vercel CLI or Vercel GitHub integration
    - Supabase migration safety check (diff against production schema)
```

**Environment separation:**
- Local dev: `.env.local` with test Stripe keys + local/dev Supabase project
- Staging (Vercel preview): separate Supabase project, Stripe test keys
- Production (Vercel production): production Supabase project, Stripe live keys

**Vercel setup steps:**
1. `npm install -g vercel`
2. `vercel login`
3. `vercel link` (links to Vercel project)
4. Set all env vars in Vercel dashboard (Settings → Environment Variables)
5. Set `NEXT_PUBLIC_APP_URL` to production domain
6. Configure Stripe webhook endpoint in Stripe dashboard to production URL

**Supabase migration safety:**
- All schema changes MUST go through migration files in `supabase/migrations/`
- Never make manual changes in Supabase dashboard in production
- Migration naming: `YYYYMMDD_description.sql` (sequential)
- Apply with: `supabase db push` or run SQL manually in Supabase SQL editor
- Before production migration: test on staging Supabase project first

**Rollback strategy:**
- Frontend: Vercel instant rollback via dashboard (previous deployment)
- Database: write DOWN migrations for every UP migration (not yet done — add in this phase)
- Stripe: webhook endpoint can be toggled off in Stripe dashboard instantly

**Quality gates — CI must FAIL if:**
- TypeScript errors exist (`tsc --noEmit` exit code != 0)
- ESLint errors exist
- `next build` fails
- (future) test coverage drops below threshold

**Secrets management:**
- GitHub Actions secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Never commit `.env.local` — already in `.gitignore`
- Stripe test vs live keys must be in separate Vercel environments

---

### 🔲 Phase 8 — Final Production Deployment

**Pre-deployment checklist:**
- [ ] All migrations applied to production Supabase
- [ ] Stripe live keys configured in Vercel
- [ ] Stripe webhook endpoint set to production URL with `charge.refunded` + `checkout.session.completed`
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Email domain verified in Resend
- [ ] Admin user created in production (`is_admin = true` in profiles)
- [ ] RLS policies verified (no data leaks)
- [ ] `enable_confirmations = true` in Supabase auth config for production
- [ ] Supabase connection pooling enabled (for Vercel serverless)
- [ ] Rate limiting on `/api/checkout` and `/api/webhooks/stripe`
- [ ] Error monitoring setup (Sentry recommended — `npm install @sentry/nextjs`)

**Performance checklist:**
- [ ] Menu page: `revalidate = 60` (already set)
- [ ] Images: use Next.js `<Image>` component with Supabase Storage URLs
- [ ] Database: indexes already created in migration 001
- [ ] Bundle size: run `npm run build` and check chunk sizes

---

## Currency
AUD — hardcoded in `/api/checkout/route.ts` (`currency: 'aud' as const`).
Change this string if deploying for a different market. Also update GST rate in `lib/utils.ts` if needed.

## Loyalty Points
- Rate: 1 point per $1 spent = `floor(total_cents / 100)`
- Multiplier constant `POINTS_MULTIPLIER = 1.0` in webhook — change here to adjust rate
- Earned: after `checkout.session.completed` (logged-in users only)
- Reversed: after `charge.refunded` (looks up original earn transaction for exact points)
- Redemption: NOT YET IMPLEMENTED — earn-only in MVP. Phase 5+ can add redemption at checkout.
- Balance floors at 0 — cannot go negative (enforced in `increment_loyalty_points()` SQL function)

## Admin Access
- Set `is_admin = true` in `profiles` table via Supabase SQL editor
- No self-serve admin signup — manual only
- `/admin/*` routes protected by `lib/supabase/middleware.ts` — checks auth + is_admin, redirects to `/login` or `/` if not authorized
- Admin uses service role client in API routes for unrestricted DB access
