# SentryHub — Account Setup & Deploy Walkthrough

Follow these in order. There are two phases:

- **Phase A — Run it locally** (prove it works end to end on your machine).
- **Phase B — Deploy to Vercel** (put it live on the internet).

Estimated time: ~45–60 min the first time. You'll create 3 free accounts
(Supabase, Mux, Vercel) and optionally a 4th (Resend, for email).

> 🔑 I already generated your push keys and webhook secret — they're in
> **`.env.generated`** in this project. You'll paste those in below; you do NOT
> need to generate them yourself.

---

## Before you start

Install if you don't have them:

- **Node.js 18.18+** — https://nodejs.org (LTS)
- **Git** — https://git-scm.com
- A **GitHub account** — https://github.com (needed for Vercel)

Open a terminal in the project folder and install dependencies:

```bash
npm install
```

---

## Phase A — Run locally

### A1. Create a Supabase project

1. Go to https://supabase.com → **Start your project** → sign in with GitHub.
2. **New project**. Pick a name (e.g. `sentryhub`), set a database password
   (save it somewhere), choose a region near you, click **Create new project**.
   Wait ~2 minutes for it to provision.

### A2. Create the database

1. In your project, left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy the **entire** file,
   paste it into the editor, click **Run**.
3. You should see "Success. No rows returned." This created every table, all the
   security policies, triggers, the analytics RPCs, and seeded the tags +
   feature flags.

### A3. Grab your Supabase keys

1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → `anon` `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → `service_role` `secret`** → `SUPABASE_SERVICE_ROLE_KEY`
     (⚠️ secret — server only, never share or commit it.)

### A4. Create a Mux account + token

1. Go to https://www.mux.com → **Start building** / sign up.
2. Dashboard → **Settings → API Access Tokens → Generate new token**.
   - Environment: your project/sandbox.
   - Permissions: enable **Mux Video** (Read + Write).
   - Click **Generate token**. Copy:
     - **Token ID** → `MUX_TOKEN_ID`
     - **Token Secret** → `MUX_TOKEN_SECRET` (shown once — copy now)
3. Leave the Mux **webhook** step for A7 (it needs a public URL).

> 💳 Mux asks for a card to remove watermarks/limits, but the free tier +
> 100k free delivery minutes/month mean an alpha typically costs ~$0.

### A5. Fill in `.env.local`

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your values. Copy the three generated lines
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NOTIFY_WEBHOOK_SECRET`)
straight from **`.env.generated`**. Set `VAPID_SUBJECT` to your email. Leave
`RESEND_API_KEY` blank for now (email just no-ops without it). It should look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
VIDEO_PROVIDER=mux
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=            # fill in A7
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # from .env.generated
VAPID_PRIVATE_KEY=             # from .env.generated
VAPID_SUBJECT=mailto:you@example.com
NOTIFY_WEBHOOK_SECRET=         # from .env.generated
```

### A6. Configure auth redirect

1. Supabase → **Authentication → URL Configuration**.
2. Under **Redirect URLs**, add: `http://localhost:3000/auth/callback`
3. (Optional, for fast testing) **Authentication → Providers → Email** → turn
   **Confirm email** OFF so you can log in immediately after signup.

### A7. Expose your machine so webhooks can reach it

Mux and Supabase need to call your app, but `localhost` isn't reachable from the
internet. Use a tunnel. With **ngrok** (https://ngrok.com, free):

```bash
# in a separate terminal, after starting the app (A8)
ngrok http 3000
```

It prints a public URL like `https://abc123.ngrok-free.app`. Use that below as
`<PUBLIC_URL>`.

Then:

- **Mux webhook**: Mux dashboard → **Settings → Webhooks → Create new webhook**.
  URL = `<PUBLIC_URL>/api/webhooks/mux`. After creating, copy its **Signing
  Secret** into `MUX_WEBHOOK_SECRET` in `.env.local`.
- **Notification webhook**: Supabase → **Database → Webhooks → Create a new hook**.
  - Name: `notify-dispatch`
  - Table: `notifications`, Events: **Insert**
  - Type: **HTTP Request**, Method: **POST**
  - URL: `<PUBLIC_URL>/api/webhooks/notification`
  - HTTP Headers: add `x-webhook-secret` = your `NOTIFY_WEBHOOK_SECRET`.

> If you skip the tunnel, the app still runs — but videos will stay "Processing"
> (no ready webhook) and email/push won't fire. The tunnel is what makes the
> full pipeline work locally.

### A8. Run it

```bash
npm run dev
```

Open http://localhost:3000. Restart `npm run dev` after any `.env.local` change.

### A9. Smoke test

1. **Sign up** → you land logged in.
2. Make yourself admin: Supabase → SQL Editor →
   ```sql
   update public.profiles set role = 'admin' where username = 'your_username';
   ```
   Refresh — an **Admin** link appears in the nav.
3. **Upload** a short video → it shows "Processing", then flips to playing once
   Mux finishes (needs the tunnel + Mux webhook).
4. Visit **/dashboard** (your stats), **/admin** (moderation + analytics),
   **/admin/users**, **/admin/ads** (create a campaign + a `feed` ad, then see it
   on the home page).
5. **Settings** → enable push, follow a tag → uploads on that tag notify you.

If all that works, you're ready to go live.

---

## Phase B — Deploy to Vercel

### B1. Push the code to GitHub

```bash
git init
git add .
git commit -m "SentryHub alpha"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR_USER/sentryhub.git
git branch -M main
git push -u origin main
```

`.env.local` is gitignored, so your secrets are NOT pushed. Good.

### B2. Import into Vercel

1. Go to https://vercel.com → sign in with GitHub → **Add New… → Project**.
2. Import your `sentryhub` repo. Framework auto-detects as **Next.js**. Don't
   deploy yet — first add env vars (next step).

### B3. Add environment variables in Vercel

Project → **Settings → Environment Variables**. Add every line from your
`.env.local`, with two changes:

- `NEXT_PUBLIC_APP_URL` = your Vercel URL (e.g. `https://sentryhub.vercel.app`).
  You'll know it after the first deploy; set it now to your best guess and update
  if needed.
- Everything else: same values as local (Supabase, Mux, VAPID, secrets).

Then **Deploy**. Vercel builds and gives you a live URL.

### B4. Point the webhooks + auth at production

Now that you have a real domain, update the three places that referenced the
tunnel:

1. **Supabase → Authentication → URL Configuration → Redirect URLs**: add
   `https://YOUR_DOMAIN/auth/callback`.
2. **Mux → Settings → Webhooks**: edit (or add) the endpoint to
   `https://YOUR_DOMAIN/api/webhooks/mux`. If the signing secret changed, update
   `MUX_WEBHOOK_SECRET` in Vercel and redeploy.
3. **Supabase → Database → Webhooks**: edit `notify-dispatch` URL to
   `https://YOUR_DOMAIN/api/webhooks/notification` (keep the `x-webhook-secret`
   header).

> Web push only works over HTTPS — which Vercel gives you automatically, so push
> will work in production even though it needed the tunnel locally.

### B5. (Optional) Email via Resend

1. https://resend.com → sign up → **API Keys → Create** → copy into
   `RESEND_API_KEY` (Vercel env).
2. For real "from" addresses, verify your domain in Resend and set `EMAIL_FROM`
   (e.g. `SentryHub <noreply@yourdomain.com>`). Until then the default
   `onboarding@resend.dev` works for testing.
3. Redeploy.

### B6. Final production check

On your live URL: sign up, set yourself admin via SQL once more (production DB is
the same Supabase project unless you made a separate one), upload a clip, confirm
it processes and plays, and confirm an email/push arrives for a followed-tag
upload.

---

## Going live checklist

- [ ] `Confirm email` turned back **ON** in Supabase (you turned it off for testing).
- [ ] At least one **admin** account created.
- [ ] Mux out of "test" if you added billing; watermark removed.
- [ ] `NEXT_PUBLIC_APP_URL` matches your real domain.
- [ ] A custom domain added in Vercel (Settings → Domains) if you have one — then
      update the redirect/webhook URLs and `NEXT_PUBLIC_APP_URL` again.
- [ ] Spot-check RLS: a logged-out user can watch but not upload/comment; a
      non-admin can't reach `/admin`.

## Common gotchas

- **Video stuck on "Processing"** → Mux webhook URL wrong, or `MUX_WEBHOOK_SECRET`
  doesn't match the one Mux shows. Check Mux → Webhooks → recent deliveries.
- **No email/push** → notification webhook not firing or `x-webhook-secret`
  mismatch; check Supabase → Database → Webhooks → logs. Push also needs the user
  to have clicked "Enable push" in Settings and granted permission.
- **"Invalid signature" in logs** → a secret in Vercel doesn't match the provider.
- **Login redirect fails** → the exact callback URL isn't in Supabase's allowed
  Redirect URLs.
