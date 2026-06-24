# Legion frontend

Next.js 15 + Tailwind + shadcn/ui. Talks to the Spring Boot backend on
`http://localhost:8080` (configurable via `NEXT_PUBLIC_API_BASE_URL`).

## What's here right now

This is the first slice: login + an admin dashboard that reads the live
users list from `GET /api/admin/users`. The rest of the customer and admin
flows ship in follow-up slices — see the parent project's CLAUDE notes for
the planned slice order.

| Page | What it does |
| --- | --- |
| `/login` | Email + password, calls `POST /api/auth/login`, stores JWT in localStorage |
| `/admin` | Lists users via `GET /api/admin/users`. Route guard: redirects non-admins to `/login` |
| `/` | Bounces to `/login` or `/admin` based on stored role |

## Running

Backend first (Spring Boot must be up, with at least one admin seeded):

```bash
# in repo root
export APP_JWT_SECRET="<32+ chars>"
export SPRING_PROFILES_ACTIVE=prod
export SPRING_DATASOURCE_URL='jdbc:postgresql://<supabase-pooler>:5432/postgres?sslmode=require'
export SPRING_DATASOURCE_USERNAME='postgres.<project-ref>'
export SPRING_DATASOURCE_PASSWORD='<password>'
export APP_BOOTSTRAP_ADMIN_EMAIL='admin@gmail.com'
export APP_BOOTSTRAP_ADMIN_PASSWORD='<strong>'
java -jar target/legion-0.0.1-SNAPSHOT.jar
```

Frontend:

```bash
cd frontend
cp .env.local.example .env.local   # optional; defaults to localhost:8080
npm install
npm run dev
# open http://localhost:3000
```

Log in with the admin credentials you seeded.

## Notes

- **JWT in localStorage** is the simplest path and what we picked here. For
  a production deployment we should move to an httpOnly cookie with
  refresh-token rotation, which means a Next.js Route Handler that
  proxies `/api/*` and sets cookies. Tracked as a follow-up.
- **No SSR data fetching yet.** The dashboard uses TanStack Query
  client-side because the JWT lives in localStorage. SSR would require the
  cookie change above.
- **No automated UI tests.** Backend coverage is 87%; the UI is verified
  manually for now. Playwright is a candidate for future slices.
