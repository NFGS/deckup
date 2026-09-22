# Security Notes — DeckUp

| Field       | Value                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                                                                     |
| **Date**    | 2026-09-22                                                                                                                              |
| **Method**  | SWEBOK V4.0a, KA13 (Software Security) §2–§4 · OWASP Top 10 (2021)                                                                      |
| **Related** | [`../02-architecture/adr/ADR-0006-authentication.md`](../02-architecture/adr/ADR-0006-authentication.md) · [`runbook.md`](./runbook.md) |

---

## 1. Controls in place

| Area                    | Control                                                                                                                                                | Where                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Authentication**      | Argon2id hashing (19 MiB, t=2, p=1), short-lived JWT in memory, rotating refresh cookie (`httpOnly`, `SameSite=Lax`), token-family revocation on reuse | `infrastructure/security`, `application/auth` |
| **Authorization**       | Every query is scoped by `ownerId`; cross-account access returns `404` (no existence leak)                                                             | Repositories, use cases                       |
| **Input validation**    | Zod schemas from `@deckup/shared` validated at the HTTP edge and re-validated in domain factories                                                      | `presentation/common/pipes`                   |
| **Transport & headers** | Helmet defaults, CORS allow-list with credentials, `trustProxy` for correct client IPs                                                                 | `bootstrap/register-plugins.ts`               |
| **Abuse prevention**    | Global rate limiting plus stricter limits on `/auth/*` (10 req/min)                                                                                    | `@nestjs/throttler`                           |
| **File uploads**        | Multipart limited to 1 MB / 1 file; CSV parsed with a hardened parser                                                                                  | `imports.controller.ts`, `csv-parse`          |
| **SQL injection**       | Prisma client everywhere; the only raw SQL is parameterised (`Prisma.sql` tagged templates)                                                            | `prisma-study-analytics.repository.ts`        |
| **Secrets**             | Environment variables only; `.env` ignored, `.env.example` documents the shape                                                                         | `.gitignore`, `SPEC.md` §3                    |
| **Error handling**      | RFC 9457 problem responses without stack traces; internal errors logged server-side only                                                               | `domain-exception.filter.ts`                  |
| **Dependencies**        | `pnpm audit --audit-level critical` in CI; lockfile pinned                                                                                             | `.github/workflows/ci.yml`                    |

## 2. Automated verification

| Check                            | Command / suite                                        |
| -------------------------------- | ------------------------------------------------------ |
| Repository secret/injection scan | `security-scan` tool → **0 findings** (2026-09-22)     |
| Dependency audit                 | `pnpm audit` → no critical findings (see §3)           |
| Authentication abuse             | `test/throttling.e2e-spec.ts` (429 on brute force)     |
| Session hardening                | `test/auth.e2e-spec.ts` (CSRF header, rotation, reuse) |
| Ownership isolation              | decks, cards, study and imports e2e suites             |

## 3. Accepted risks

`pnpm audit` reports six advisories (3 high, 3 moderate) in transitive
dependencies of the **Prisma CLI and its config loader** (`mysql2`,
`deepmerge-ts`, and related packages). Assessment:

- They live in the Prisma toolchain (`prisma`, `@prisma/config`), not in the
  request path of the running API; DeckUp uses PostgreSQL through
  `@prisma/adapter-pg`.
- The affected code paths (MySQL authentication, config merging of untrusted
  input) are never exercised by the application or by untrusted data.
- Fixes require Prisma 8.x, currently in release-candidate state; the project
  deliberately stays on the stable 7.x line (ADR-0003).

**Follow-up**: upgrade to Prisma 8.x once it is stable, then re-run
`pnpm audit`. Until then CI fails only on _critical_ advisories.

## 4. OWASP Top 10 (2021) mapping

| Risk                                       | Status                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| A01 Broken access control                  | Mitigated — owner-scoped queries, 404 on foreign resources                     |
| A02 Cryptographic failures                 | Mitigated — Argon2id, HTTPS-only cookies in production, no secrets at rest     |
| A03 Injection                              | Mitigated — Prisma + parameterised raw SQL, Zod validation                     |
| A04 Insecure design                        | Addressed — threat-modelled auth (ADR-0006), rate limiting                     |
| A05 Security misconfiguration              | Addressed — validated env at boot, Helmet, CORS allow-list                     |
| A06 Vulnerable components                  | Monitored — audit in CI, accepted risks documented (§3)                        |
| A07 Identification/authentication failures | Mitigated — timing-equalised login, generic errors, rotation + reuse detection |
| A08 Integrity failures                     | Mitigated — lockfile, Conventional Commits, immutable migrations               |
| A09 Logging/monitoring failures            | Partial — structured Nest logs and `/health`; Sentry is a future step          |
| A10 SSRF                                   | Not applicable — the API never fetches user-supplied URLs                      |

## 5. Incident response

1. **Contain** — rotate `JWT_ACCESS_SECRET` (invalidates sessions) and the
   database credentials in Neon/Railway.
2. **Assess** — review API logs for the affected window; identify accounts and
   endpoints touched.
3. **Recover** — restore from a Neon branch if data integrity was affected
   (see [`backup-policy.md`](./backup-policy.md)).
4. **Notify** — inform affected users by email with the scope and remediation.
5. **Learn** — add a regression test reproducing the issue before closing it.
