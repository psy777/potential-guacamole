# 🔥 FireCoast

A local order & invoicing manager. Track customers, items, and packages; build
orders; send invoices; collect payments through **Stripe** or **Square**; and
get documents signed with **DocuSeal**.

This is a clean rebuild of the original FireCoast — one language (TypeScript),
one small file per job, real logins, and money stored correctly.

---

## What it does

- **Contacts, items, packages** — your customers and catalog.
- **Orders & invoices** — line items, discounts, tax, shipping, with a
  server-generated PDF invoice (works fully offline — no CDN).
- **Payments** — generate a Stripe or Square payment link for any order; record
  cash/check payments manually. "Paid in full" is *derived* from recorded
  payments, never a manual flag.
- **E-signatures** — request a DocuSeal signature on an order and store the
  signed PDF.
- **Email** — send invoices through Resend from your own domain.
- **Users** — individual logins with an audit trail of who did what.
- **Notes** — a private per-user scratchpad.

## Tech

Next.js (App Router) · TypeScript · SQLite (via Drizzle ORM) · React-PDF.
Everything runs in one Node process. Data lives in `./data/firecoast.db`.

```
app/            pages + server actions (one folder per feature)
  (app)/        the signed-in app (dashboard, orders, contacts, …)
  api/          PDF download, file serving, and webhook receivers
lib/
  db/           schema.ts (the source of truth) + connection + migrations
  services/     business logic — orders, payments/*, documents/*, email, pdf
  auth/         sessions, password hashing, users
scripts/        seed-admin, import-legacy
```

---

## Quick start

Requires **Node 20 or newer**.

```bash
npm install
cp .env.example .env          # optional — every key can be added later
npm run db:generate           # create SQL migration files from the schema
npm run build
npm start                     # http://localhost:3000
```

On first launch, open the app and you'll be asked to **create your admin
account**. That's it — you're in.

For development: `npm run dev`.

> The database migrates itself automatically on startup. A background poller
> also starts automatically to reconcile payment/signature status (see below).

### Importing data from the old FireCoast

```bash
npm run import:legacy -- /path/to/old/data/orders_manager.db
```

This copies contacts, items, and orders into the new database, converting the
old float dollar amounts to integer cents. It's a best-effort aid — review the
results afterward.

---

## A note on webhooks vs. polling

Stripe, Square, and DocuSeal normally tell you about events by calling a public
URL (a *webhook*). Because FireCoast runs locally (no public URL), it instead
**polls** each provider every minute for status changes — no tunnels required.
The webhook routes at `/api/webhooks/*` still exist and will be used
automatically if you ever expose the app publicly (or self-host DocuSeal, whose
webhook can reach `localhost` directly). You don't have to do anything to get
polling; it just works.

---

## Getting your API keys

Add these to `.env`. Each integration is optional and turns on as soon as its
keys are present (check the **Settings → Integrations** page to see status).

### Resend (email) — send invoices from your domain

1. Create an account at <https://resend.com>.
2. **Add & verify your domain**: Dashboard → *Domains* → *Add Domain*, then add
   the DNS records they give you (SPF/DKIM). This is what makes email land in
   inboxes instead of spam.
3. Create an API key: *API Keys* → *Create API Key* (read/send access).
4. In `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM="Your Business <orders@yourdomain.com>"
   ```
   `EMAIL_FROM` must use the domain you verified.

### Stripe — card payments via payment links

1. Create an account at <https://stripe.com> and stay in **Test mode** (toggle,
   top-right) while setting up.
2. Get your secret key: *Developers → API keys → Secret key* (`sk_test_…` in
   test mode, `sk_live_…` when you go live).
3. In `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxx
   ```
4. That's all you need for payment links + polling. **Optional webhook** (only
   if you expose the app publicly): *Developers → Webhooks → Add endpoint*,
   URL `https://your-public-url/api/webhooks/stripe`, subscribe to
   `checkout.session.completed`. Copy the *Signing secret* (`whsec_…`) into
   `STRIPE_WEBHOOK_SECRET`.
5. Test cards: `4242 4242 4242 4242`, any future expiry, any CVC.

### Square — payments / POS

1. Go to the Square Developer Dashboard: <https://developer.squareup.com>.
2. *Applications → +* to create an app.
3. Open your app and pick the **Sandbox** credentials while testing:
   - *Sandbox Access token* → `SQUARE_ACCESS_TOKEN`
   - *Locations* (Sandbox test account) → copy a **Location ID** →
     `SQUARE_LOCATION_ID`
4. In `.env`:
   ```
   SQUARE_ACCESS_TOKEN=EAAA...        # sandbox token while testing
   SQUARE_LOCATION_ID=L...
   SQUARE_ENVIRONMENT=sandbox         # switch to "production" when live
   ```
5. Going live: switch to the app's **Production** credentials, set
   `SQUARE_ENVIRONMENT=production`, and use a real Location ID.
6. **Optional webhook** (public only): *Webhooks → Subscriptions → Add*, URL
   `https://your-public-url/api/webhooks/square`, subscribe to `payment.updated`.
   Copy the **Signature key** into `SQUARE_WEBHOOK_SIGNATURE_KEY`.

### DocuSeal — e-signatures

You can use hosted DocuSeal or self-host it (self-hosting is a great fit here
since it can run on the same machine).

**Hosted:**
1. Sign up at <https://docuseal.com>.
2. Create a **template** (the document to be signed) and note its **Template
   ID** (in the template's URL / settings).
3. Get an API key: *Settings → API*.
4. In `.env`:
   ```
   DOCUSEAL_API_URL=https://api.docuseal.com
   DOCUSEAL_API_KEY=your_api_key
   DOCUSEAL_TEMPLATE_ID=123456
   ```

**Self-hosted (recommended for a local setup):**
1. Run DocuSeal (e.g. their Docker image) on the same machine — it listens on
   port 3001 by default.
2. Create a template in its UI and grab the Template ID + API key
   (*Settings → API*).
3. In `.env`:
   ```
   DOCUSEAL_API_URL=http://localhost:3001
   DOCUSEAL_API_KEY=your_api_key
   DOCUSEAL_TEMPLATE_ID=1
   ```
4. Because DocuSeal is on the same network, its webhook can reach FireCoast
   directly: point it at `http://localhost:3000/api/webhooks/docuseal`. Set
   `DOCUSEAL_WEBHOOK_SECRET` to a shared secret and configure the same value in
   DocuSeal's webhook settings. (Without a webhook, polling still catches
   completed signatures.)

### UPS — tracking & auto-marking shipped

FireCoast can watch your UPS account, mark orders shipped, and capture tracking numbers.

1. Create an app at <https://developer.ups.com> and get **OAuth client credentials** (Client ID + Secret).
2. In `.env`:
   ```
   UPS_CLIENT_ID=...
   UPS_CLIENT_SECRET=...
   UPS_ENVIRONMENT=production   # "test" while validating
   ```
3. **Hands-off discovery:** put the **order number** (e.g. `ORD-1042`) or the **invoice ID** (`1042`) into the **reference number** field when you print the UPS label, and enable **Quantum View** on your UPS account. FireCoast polls Quantum View, matches the reference to the order, fills in the tracking number, and marks it **shipped**.
4. Even without Quantum View, paste a tracking number into an order's **Shipping** card — FireCoast then keeps its delivery status current and auto-marks it shipped once UPS scans it.

---

## Security notes

- All routes require a login except the webhook receivers, which are
  authenticated by each provider's signature instead.
- Passwords are hashed (bcrypt). Sessions are server-side, httpOnly cookies.
- **Secrets live only in `.env`** — never in the database, never returned by the
  app. `.env` and the `./data` folder are git-ignored.
- Money is stored as integer cents everywhere. There are no float amounts.
