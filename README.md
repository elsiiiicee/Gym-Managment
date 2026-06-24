# Legion — Gym Management Platform

A full-stack gym management system: member accounts, class booking, membership
subscriptions, a store with wallet-based checkout, trainer payroll, and an admin
panel — plus a member self-service app.

- **Backend:** Java 21 · Spring Boot 4 · Spring Security (JWT) · Flyway · JPA
- **Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS
- **Database:** Postgres / Supabase for production

---

## Quick start (local, no database to install)

You need **Java 21** and **Node.js 20+** installed..

Open **two terminals** in the project root.

**Terminal 1 — backend** (http://localhost:8080):
**Terminal 2 — frontend** (http://localhost:3000):

```powershell
.\scripts\run-stack.ps1     
```

Then open **http://localhost:3000** and sign in:

| Field    | Value             |
|----------|-------------------|
| Email    | `admin@gmail.com` |
| Password | `AdminTest123!`     |

That account is the admin. You can also click **Register** on the login
page to create a regular member and explore the member side (`/me`).

---

## Running the tests

```bash
# Backend: unit + integration tests with an 80% coverage gate
APP_JWT_SECRET=ci-only-secret-at-least-32-bytes-long ./mvnw verify

---

## Project layout

```
.
├── src/main/java/com/unyt/legion/   # Spring Boot backend
│   ├── user/          auth, accounts, profiles
│   ├── wallet/        member wallet (credits, debits, transactions)
│   ├── subscription/  membership plans + subscriptions
│   ├── booking/       gym classes + bookings
│   ├── store/         products, cart, checkout, orders, payments
│   ├── trainer/       trainers + payroll
│   ├── security/      JWT, rate limiting, security headers
│   └── config/        security config, bootstrap admin, prod guards
├── src/main/resources/db/migration/ # Flyway schema (V1–V4)
├── frontend/                         # Next.js app (admin panel + member app)
├── scripts/                          # ops scripts (Supabase, backup, run-stack)
├── docs/                             # supabase setup + production-readiness report
└── run-backend.* / run-frontend.*    # local run scripts
```

---

## Production / real database

For a real deployment, point the backend at Postgres (e.g. Supabase) by setting
these environment variables and activating the `prod` profile:

```
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>?sslmode=require
SPRING_DATASOURCE_USERNAME=<user>
SPRING_DATASOURCE_PASSWORD=<password>
APP_JWT_SECRET=<a strong secret, at least 32 bytes>
```

---

