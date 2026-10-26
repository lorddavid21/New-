# Haven Estate

A responsive, browser-only real-estate listing website built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, and private Supabase Storage. No native or desktop application is included.

## Current implementation

- Responsive public homepage, property directory with server-side keyword/category/listing-type/currency/price/bedroom filters, sorting, paginated load-more results, and property detail pages.
- Agent registration/login/logout, protected dashboard, create/edit/deactivate/delete listing actions.
- Property creation validates form fields and two-to-eight JPEG/PNG/WebP images (6 MB each), checks image signatures on the server, and cleans up uploaded files when a save fails. Editing can preserve, remove, or add photos while maintaining the two-photo minimum.
- Agent ownership and active-account authorization are checked by RLS and server actions. Administrator management uses a narrowly scoped database function.
- Private property images are exposed via signed URLs only when the associated listing is published.
- Direct phone and WhatsApp contact links are provided when a real agent phone is available.
- The homepage and directory use conspicuously marked preview listings only when Supabase environment values are absent. Preview data is not a persistence layer; replace its copy/images with verified client material before launch.

The MVP treats **batch sales** as one listing for multiple properties being sold together. Each public listing has one sale/rent type.

## Local setup

Requirements: Node.js 22 or newer, npm, and a Supabase project. From this directory:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Set these variables in `.env.local`:

| Variable | Where to find it | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API settings | Project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project API settings | Publishable/anon key (public; protected by RLS) |
| `NEXT_PUBLIC_SITE_URL` | Your deployed site URL | Canonical/sitemap/robots origin |

Never add a Supabase service-role/secret key to this application. No service-role key is required by the website.

## Supabase configuration

1. Create a Supabase project and configure its Auth email/redirect settings for local development and the production website.
2. Apply `supabase/migrations/20261026000000_initial_schema.sql` using the Supabase CLI or SQL editor. It creates the schema, profile trigger, RLS policies, private `property-media` bucket, storage policies, and admin account-status RPC.
3. Set the three public website environment variables above in local development and your hosting provider. Restart the dev server.
4. Register an agent and verify their email if email confirmation is enabled. The Auth trigger creates an `agent` profile; public registration cannot assign admin.
5. To bootstrap the first administrator, create and verify a trusted account through the website. In the Supabase SQL editor, run a reviewed, one-time command using that exact email, then remove the literal email from query history where your operational policy requires it:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users
     where email = 'trusted-admin@example.com'
   )
   and role = 'agent';
   ```

   Verify exactly one profile changed. Never bootstrap based on registration order and never expose database credentials in browser code.
6. The bucket is private. Its migration policies allow public reads only for objects attached to published listings. The app creates one-hour signed image URLs. Reapply/check policies whenever changing storage configuration.

Properties support an optional validated HTTPS video link; video-file uploads are not included. Admin agent search and account status controls are included.

## Development sample data

The TypeScript preview records in `src/lib/properties.ts` are sample-only and appear only when Supabase URL/key are not configured. They are marked in the UI, and have no real agent contact details. Once Supabase is configured, the application reads live database records and does not use browser storage as a fallback.

To seed two clearly marked example listings into a **development-only** Supabase project, first register a development agent and apply the migration. Copy `.env.seed.example` to `.env.seed`, set that project's URL, service-role key and the registered agent UUID, and explicitly retain `SEED_DEVELOPMENT_ONLY=true`; then run:

```powershell
npm run seed:demo
```

The script downloads sample photos from Unsplash and uses a server-side service key only in this standalone local script. It refuses to overwrite a matching non-demo listing. Never add `.env.seed` to source control, never expose the service key to the browser, and never run this script against production. The app itself does not require a service-role key.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Authorization workflows require a configured Supabase project and separate test agent/admin accounts; verify RLS and storage policies against that project before launch. Do not use live user data as test data.

## Deployment

Deploy the website as a Node.js Next.js application (for example, a configured Vercel project or another host that supports the Next.js App Router). Configure all three public environment variables in the hosting provider, run the SQL migration against the intended Supabase project, and configure Supabase Auth site URL/redirect URLs to the HTTPS production domain. Build using `npm run build`.

Review hosting, database, storage, image bandwidth, email delivery, backup/restore, and monitoring costs with the client before production. Free tiers may not be suitable for commercial traffic or retention requirements. Back up the database and uploaded media under an agreed retention policy. Monitor failed uploads and failed media-cleanup requests.

## Launch checklist

- [ ] Apply migration and inspect RLS/storage policies in the intended Supabase project.
- [ ] Configure email verification, password recovery, redirect URLs, and production environment values.
- [ ] Bootstrap and test an administrator using the trusted process above.
- [ ] Test two distinct agents: ownership isolation, publish with two images, edit, deactivate, delete, and disabled-account mutation denial.
- [ ] Test public browsing, empty results, image visibility for unpublished/published listings, phone/WhatsApp links, and responsive keyboard navigation.
- [ ] Replace preview content with client-approved imagery and verified property/agent/contact details.
- [ ] Agree on video support, admin reporting workflow, hosting tier, backup retention, and operational monitoring.
- [ ] Run lint, TypeScript, and production-build checks after dependencies are installed.
