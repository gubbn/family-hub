# Family Hub

A family-friendly PWA for routines, chores, meals, planning and boredom
busters. Adults sign in by secure email link. Children use profiles inside
their household and do not need email accounts.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. In Supabase, open **Project Settings → API** and copy the project URL and
   publishable/anon key into `.env.local`.
3. Run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Never put the Supabase service-role key in this app. The public key is safe to
ship only because access is protected by authentication and Row Level Security.

## Supabase authentication

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to the production Vercel address.
- Add `http://localhost:3000/**` for local development.
- Add the production Vercel address and any preview-address pattern you intend
  to use as redirect URLs.

Email magic-link sign-in must remain enabled.

The database migrations are in `supabase/migrations`. Existing data is migrated
into one household and can be claimed once by its owner. New customers create a
new household during first sign-in.

## Docker

The browser Supabase values are compiled into the Next.js build:

```powershell
docker build `
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$env:NEXT_PUBLIC_SUPABASE_URL `
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:NEXT_PUBLIC_SUPABASE_ANON_KEY `
  -t family-hub .

docker run --rm -p 3000:3000 family-hub
```

Rebuild the image whenever application code or either build argument changes.

## Verification

```bash
npm run check
```

This runs linting, TypeScript checks, and the production build. GitHub Actions
runs the same checks on pushes and pull requests.

## Vercel

Connect the GitHub repository in Vercel, then add these variables under
**Project Settings → Environment Variables** for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deploy the `main` branch after the Supabase redirect URLs include the final
Vercel domain.
