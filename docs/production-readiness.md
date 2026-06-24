# Production Readiness Report — Legion

_Date: 2026-06-22 · Scope: backend (Spring Boot 4 / Java 21), frontend (Next.js), CI/CD, ops._

This report lists what must be fixed before this project is production-ready, ordered
by severity. Each item notes **where**, **why it matters**, and a **suggested fix**.

The codebase is in good shape overall — stateless JWT auth, BCrypt(12), Flyway-managed
schema in prod, `ddl-auto=validate`, rate limiting, security headers, CORS lockdown, a
startup guard for the JWT secret, and ~80% test coverage gate. The items below are the
gaps that remain.

---

> **Note:** Docker (`Dockerfile`, `Dockerfile.frontend`, `docker-compose.yml`,
> `.dockerignore`) has since been removed in favor of plain run scripts
> (`run-backend.*` / `run-frontend.*`) — see the root `README.md`. Items below
> that reference Docker images, compose volumes, or container redeploys describe
> the previous setup; the underlying concerns (e.g. durable uploads) still apply
> to whatever runtime you deploy on.

## ✅ Status update — fixed in this pass

`./mvnw verify` is **green** (37 tests, 80% coverage gate met) and `frontend` builds with
standalone output. The following were completed:

- **Frontend CI + Docker build** (#1): CI job now runs in `frontend/`; `Dockerfile.frontend`
  COPYs from `frontend/`; `next.config.ts` emits `output: "standalone"`. Frontend build
  verified to produce `.next/standalone/server.js`.
- **Dead email outbox** (#2): removed the `mail_outbox` write and the unused
  `MailOutboxMessage`/`MailOutboxRepository`. Documented that v1 has no email delivery and
  account recovery is admin-driven. (The `mail_outbox_messages` *table* still exists in V1
  migration — drop it in a future forward migration; left in place to avoid `validate`
  churn on existing DBs. Unmapped tables don't fail `ddl-auto=validate`.)
- **H2 console** (#3): removed `spring-boot-h2console`; set `spring.h2.console.enabled=false`.
- **Wallet status drift** (#3b): confirmed 402 is the intended contract (frontend doesn't
  branch on it); updated the 5 stale tests to expect 402 / `InsufficientWalletBalanceException`.
- **Membership-plan 500s** (new, found while fixing the suite): POST 500'd on an omitted
  primitive `boolean` (boxed it to `Boolean`); PUT 500'd on a null/lazy `features`
  collection (null-guarded `PlanAdminResponse.from` + made create/update `@Transactional`).
- **Exception handling + logging** (#7 partial): added a `HttpMessageNotReadableException`
  → **400** handler (malformed bodies were becoming 500), and the catch-all 500 handler now
  **logs the cause** (`log.error`) so prod 500s are diagnosable. Bad-body logged at WARN.
- **Actuator** (#4): `management.endpoint.health.show-details=never` in the prod profile.
- **Rate limiter** (#5 partial): prod sets `server.forward-headers-strategy=framework` so
  `getRemoteAddr()` resolves the real client IP behind a proxy; documented the per-instance
  / multi-replica limitation in code.
- **Supabase values** (#6): scrubbed the real project URL/key from `.env.example` to
  placeholders.
- **JWT secret strength** (#10): `ProductionSafetyRunner` now rejects a prod secret shorter
  than 32 bytes (covered by new `ProductionSafetyRunnerTest`).
- **Polish** (#13 partial): filled POM `name`/`description`, removed empty metadata blocks,
  labeled the CI throwaway secret, excluded dev-only `tools/**` from the coverage gate.

### Still deferred (documented, not done — larger refactors / need infra decisions)
- **RLS audit** (#6): confirm Row-Level Security is enabled on every Supabase table — the
  publishable key is only safe under RLS. (Operational, outside this repo.)
- **Structured JSON logging + correlation IDs** (#7): only the cause-logging gap was closed;
  full JSON logging / request correlation still pending.
- **JWT library migration** (#8): still hand-rolled; swap to jjwt/Nimbus.
- **Per-request user DB lookup** (#9): unchanged; revisit if load tests show pressure.
- **Bootstrap admin hardening** (#11): document unsetting bootstrap vars + force first-login
  rotation.
- **Uploads → object storage** (#12): still local disk; not multi-instance safe.
- **Other `*UpdateRequest` records with primitive `boolean active`** (Trainer/Class/Product/
  Payroll): same latent fragility as the membership bug, but currently exercised with the
  field present and now safely return 400 (not 500) if omitted. Box them when convenient.
- **Metrics endpoint, HSTS preload caution** (#13): unchanged.

---

## 🔴 Blockers (must fix before launch)

### 1. Frontend CI and Docker build are broken (wrong working directory)
- **Where:** [.github/workflows/ci.yml](../.github/workflows/ci.yml#L63-L78), [Dockerfile.frontend](../Dockerfile.frontend)
- **Why:** The frontend lives in `frontend/`, but the CI `frontend` job runs `npm ci` /
  `npm run build` from the repo root (no root `package.json`), and `Dockerfile.frontend`
  COPYs `app`, `next.config.ts`, `package-lock.json` from the root. Both fail. The deploy
  workflow ([deploy.yml](../.github/workflows/deploy.yml#L33-L39)) builds the frontend image
  from this broken Dockerfile, so **frontend deploys cannot succeed today.**
- **Fix:** Add `defaults.run.working-directory: frontend` (or `working-directory: frontend`
  per step) to the CI job. Rewrite `Dockerfile.frontend` to COPY from `frontend/` and add
  `output: "standalone"` to `frontend/next.config.ts` (the runtime stage expects
  `.next/standalone/server.js`).

### 2. Email delivery is not implemented — verification/reset emails never send
- **Where:** [AuthService.java](../src/main/java/com/unyt/legion/user/AuthService.java#L178-L186), `MailOutboxRepository`
- **Why:** `queueAccountToken` writes the email-verification token into a `mail_outbox`
  table, but **nothing ever reads or sends it** — there is no `JavaMailSender`, no
  `@Scheduled` outbox processor. Email verification is effectively dead: a user can only
  verify if someone reads the token out of the DB by hand. Any future "email me a link"
  flow has the same dead-end.
- **Fix:** Either (a) implement an outbox poller (`@Scheduled`) + `spring-boot-starter-mail`
  + SMTP config to drain `mail_outbox`, or (b) if email is out of scope for v1, remove the
  outbox/verification code path and document that verification is admin-driven, so the
  product behavior is honest.

### 3. H2 console and H2 driver ship in the production artifact ✅ FIXED
- **Where:** [pom.xml](../pom.xml) (`spring-boot-h2console`), [pom.xml](../pom.xml) (`h2` runtime)
- **Why:** The H2 web console is a classic RCE/SSRF attack surface and should never be on a
  prod classpath.
- **Done:** Removed `spring-boot-h2console` from the build and set
  `spring.h2.console.enabled=false` as defense-in-depth. `h2` stays as a runtime dep because
  the default (dev/test) profile uses an in-memory H2 datasource; prod runs the `prod`
  profile against Postgres. Main compiles clean after removal.

### 3b. Wallet over-balance status code: tests expect 409, code returns 402 (pre-existing)
- **Where:** [WalletService.java](../src/main/java/com/unyt/legion/wallet/WalletService.java#L164-L171),
  [GlobalExceptionHandler.java](../src/main/java/com/unyt/legion/common/GlobalExceptionHandler.java#L50-L63),
  [WalletServiceTest.java](../src/test/java/com/unyt/legion/wallet/WalletServiceTest.java#L73-L87)
- **Why:** `WalletService` throws `InsufficientWalletBalanceException`, which the global
  handler intentionally maps to **402 Payment Required**. But `WalletServiceTest` and
  `AdminWalletAndResetAuthorizationTest` assert **409 Conflict**. So `./mvnw verify` fails
  today (5 wallet tests) — this is a pre-existing test/code drift, **not** caused by the
  H2 change. It must be reconciled before the CI green-build gate passes.
- **Fix (needs a decision):** Either update the tests to expect 402 (if 402 is the intended
  contract — the handler comment suggests it is), or change the handler to 409 if the API
  contract should be 409. The frontend may already depend on one of these.

---

## 🟠 High (fix before or immediately after launch)

### 4. Actuator `health` exposes full details unauthenticated
- **Where:** [application.properties](../src/main/resources/application.properties#L4-L5), [SecurityConfig.java](../src/main/java/com/unyt/legion/config/SecurityConfig.java#L53)
- **Why:** `management.endpoint.health.show-details=always` plus a `permitAll` on
  `/actuator/health/**` leaks component health (DB up/down, disk, etc.) to anonymous
  callers. Useful recon for attackers.
- **Fix:** In `application-prod.properties` set
  `management.endpoint.health.show-details=when-authorized` (or `never`), and keep only the
  liveness/readiness probes public.

### 5. Rate limiting is per-instance and keyed on `getRemoteAddr()`
- **Where:** [RateLimitingFilter.java](../src/main/java/com/unyt/legion/security/RateLimitingFilter.java#L51)
- **Why:** (a) Behind a load balancer / reverse proxy, `getRemoteAddr()` is the proxy IP,
  so **all users share one bucket** (or one user can't be isolated). (b) The counter is an
  in-memory `ConcurrentHashMap` — with more than one backend replica the limit is multiplied
  by the replica count and resets on restart.
- **Fix:** Honor `X-Forwarded-For` (configure `server.forward-headers-strategy=framework`
  and a trusted-proxy setup) for the client IP. For multi-replica, back the limiter with
  Redis (e.g. Bucket4j + Redis) or enforce limits at the gateway/CDN.

### 6. Real Supabase project URL + publishable key committed to the repo
- **Where:** [.env.example](../.env.example#L1-L3)
- **Why:** The `NEXT_PUBLIC_*` publishable key is *designed* to be public (it relies on
  Row-Level Security), so this is **low data-risk** — but committing a live project URL +
  key into an `.env.example` is a smell, and it only protects you if RLS is actually enabled
  and correct on every table.
- **Fix:** Replace the values in `.env.example` with placeholders. Separately, **audit that
  RLS is enabled on all Supabase tables** (the publishable key is only safe under RLS). Note
  the backend connects via JDBC with the service credentials, so RLS does not protect the
  backend path — that's fine, but make the trust boundary explicit in docs.

### 7. No request/audit logging or structured logging configured
- **Where:** project-wide (no logback config, no access log settings)
- **Why:** In production you need correlation IDs, structured (JSON) logs for aggregation,
  and an access/audit trail for security events (logins, admin password resets, failed
  auth). Currently the global handler swallows exceptions into a generic 500 with **no log
  of the underlying cause** ([GlobalExceptionHandler.java](../src/main/java/com/unyt/legion/common/GlobalExceptionHandler.java#L77-L81)),
  so prod 500s will be undiagnosable.
- **Fix:** Log the stack trace in `handleUnexpected` (at ERROR, server-side only — keep the
  client response generic). Add JSON logging (e.g. logback-spring.xml with a JSON encoder)
  and a request-correlation filter. Log security-relevant events.

---

## 🟡 Medium

### 8. Hand-rolled JWT instead of a vetted library
- **Where:** [JwtService.java](../src/main/java/com/unyt/legion/security/JwtService.java)
- **Why:** The implementation is reasonable (HMAC-SHA256, constant-time compare via
  `MessageDigest.isEqual`, exp check), but it does **not validate the token header `alg`**,
  reuses a single `ObjectMapper`, and reimplements crypto that a maintained library handles
  (clock skew, `nbf`, key rotation, alg confusion). Custom JWT code is a recurring source of
  auth CVEs.
- **Fix:** Migrate to `io.jsonwebtoken:jjwt` or Nimbus JOSE. Enforce the expected algorithm
  explicitly. Keep the existing 256-bit secret requirement.

### 9. Per-request DB lookup on every authenticated call
- **Where:** [JwtAuthenticationFilter.java](../src/main/java/com/unyt/legion/security/JwtAuthenticationFilter.java#L33-L42)
- **Why:** Every request hits `users.findById` to confirm the user is active. Correct, but
  it's a DB round-trip per request and a scaling bottleneck under load.
- **Fix:** Acceptable for launch. If load testing (see `load-tests/`) shows pressure, add a
  short-TTL cache of `userId -> active` and invalidate on deactivate/role change.

### 10. JWT secret strength not enforced
- **Where:** [ProductionSafetyRunner.java](../src/main/java/com/unyt/legion/config/ProductionSafetyRunner.java#L24-L26)
- **Why:** The startup guard checks the secret is non-blank but not that it's ≥ 32 bytes of
  entropy (HS256 needs a 256-bit key to be safe). A short secret passes the check.
- **Fix:** Require a minimum length (e.g. ≥ 32 chars) and fail fast otherwise.

### 11. Bootstrap admin password handling
- **Where:** [BootstrapAdminRunner.java](../src/main/java/com/unyt/legion/config/BootstrapAdminRunner.java)
- **Why:** The first admin is seeded from `APP_BOOTSTRAP_ADMIN_PASSWORD`. If that env var
  lingers in the deployment environment, the credential is exposed; and there's no forced
  rotation on first login.
- **Fix:** Document that the bootstrap vars must be unset after first boot, and consider
  forcing a password change on the seeded admin's first login.

### 12. Uploads stored on local disk (not durable / not multi-instance safe)
- **Where:** [StaticUploadsConfig.java](../src/main/java/com/unyt/legion/config/StaticUploadsConfig.java), `docker-compose.yml` `uploads` volume
- **Why:** Avatars are written to a local `uploads/` dir served by the app. This doesn't
  survive container redeploys cleanly and breaks with >1 replica (file on instance A is
  invisible to instance B).
- **Fix:** Store uploads in object storage (Supabase Storage / S3) and serve via that, or
  accept single-instance + persistent volume and document the constraint. Confirm upload
  endpoints validate content-type and size.

---

## 🟢 Low / polish

- **Empty POM metadata** — [pom.xml](../pom.xml#L14-L28) has blank `<name>`, `<description>`,
  `<url>`, empty `<license>`/`<developer>`/`<scm>` elements. Fill in or remove.
- **CI JWT secret is a literal in the workflow** ([ci.yml](../.github/workflows/ci.yml#L13)) —
  acceptable (CI-only, non-prod), but keep it clearly labeled so it's never copied to prod.
- **No `/actuator/prometheus` / metrics** — add Micrometer + a metrics endpoint (secured) for
  production observability if you have a monitoring stack.
- **HSTS `preload` is enabled** ([SecurityConfig.java](../src/main/java/com/unyt/legion/config/SecurityConfig.java#L46-L49)) —
  only submit to the preload list once you're certain *all* subdomains are HTTPS-only and
  will stay that way; otherwise it's hard to undo.

---

## Suggested order of work
1. Items **1–3** (blockers) — nothing ships until CI/Docker build, email behavior, and the
   H2 console are resolved.
2. Items **4–7** (high) — actuator details, rate-limit correctness behind a proxy, scrub
   committed Supabase values + verify RLS, and add diagnostic logging.
3. Items **8–12** (medium) — JWT library, secret strength, uploads strategy.
4. Polish items as time allows.
