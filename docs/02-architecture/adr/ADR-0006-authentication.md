# ADR 0006: JWT access tokens with refresh rotation and Argon2id

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

DeckUp has two independent deployables: a browser SPA on Vercel and an API on Railway.
Authentication must work across origins, survive page reloads, protect against token theft,
and remain simple enough to audit. The data protected is personal study material — low
monetary value but high privacy sensitivity — and the student population is a classic
target for credential stuffing.

Threats considered: XSS token exfiltration, CSRF, refresh-token replay, brute-force
credential attacks, and session fixation.

## Decision

Implement first-party authentication:

- **Passwords**: hashed with **Argon2id** (memory-hard, OWASP-recommended parameters).
- **Access token**: short-lived **JWT** (15 minutes), signed HS256, kept **in memory** on
  the client (never `localStorage`).
- **Refresh token**: opaque random token, **rotating on every use**, delivered in an
  `httpOnly; Secure; SameSite=Lax` cookie scoped to the auth endpoints, hashed at rest.
- **Replay detection**: reusing a rotated refresh token revokes the whole token family.
- **Rate limiting** on `/auth/*` (per client IP; account-level limiting is a future step) with `@nestjs/throttler`.
- **CSRF**: the refresh cookie is `SameSite=Lax` and the refresh endpoint requires a
  custom header, which cross-site form posts cannot set.

## Alternatives considered

1. **Server-side sessions with a session cookie**
   - Pros: simple revocation, no token lifecycle complexity.
   - Contras: requires shared session storage (Redis) or sticky sessions on Railway;
     cross-origin cookie handling between Vercel and the API adds CORS/credential friction.
2. **Managed identity provider (Auth0, Clerk, Cognito)**
   - Pros: battle-tested, social login, MFA out of the box; removes credential handling.
   - Contras: recurring cost beyond free tier, vendor dependency, less learning value,
     and the academic deliverable benefits from showing the security design explicitly.
3. **Long-lived JWT in `localStorage`**
   - Pros: trivial to implement.
   - Contras: any XSS becomes full account takeover with no revocation path — rejected.
4. **OAuth2 / OIDC with Google only**
   - Pros: no passwords to manage; familiar UX.
   - Contras: excludes students without Google accounts and moves account lifecycle to a
     third party; planned as an **addition**, not the foundation.

## Trade-offs and justification

| Criterion           | JWT + rotation  | Server sessions | Managed IdP | JWT in localStorage |
| ------------------- | --------------- | --------------- | ----------- | ------------------- |
| XSS exposure        | ✅ short window | ✅              | ✅          | ❌ full             |
| Revocation          | ✅ token family | ✅ immediate    | ✅          | ❌                  |
| Infra complexity    | ⚠️ medium       | ⚠️ needs Redis  | ✅ low      | ✅ low              |
| Cost / independence | ✅ none         | ✅              | ⚠️ vendor   | ✅                  |

Short access tokens bound the damage of an exfiltrated token to 15 minutes; rotation with
replay detection turns a stolen refresh token into a detectable event rather than a silent
compromise. Keeping the refresh token out of JavaScript (`httpOnly`) makes XSS unable to
steal the long-lived credential. The design is implemented with Nest guards, so it stays
auditable and testable.

## Consequences

- **Positive**: no third-party auth dependency; explicit, reviewable security design;
  refresh tokens are revocable per device; brute force is rate-limited.
- **Negative / risks**: token rotation logic is subtle (family revocation, race conditions
  with parallel tabs) and must be covered by tests; password reset and email verification
  are additional scope; Argon2id parameters must be tuned to the Railway instance size.
- **Required actions**: store only hashes of refresh tokens; log authentication events
  (without secrets); test the replay-detection path; keep access tokens in memory only and
  re-authenticate silently on reload via the refresh endpoint.

## References SWEBOK

- Cap. 13, §2.1 — Security fundamentals: authentication and authorization.
- Cap. 13, §2.4 — Security: threat modeling and countermeasures.
- Cap. 13, §4.1 — Security in the software lifecycle: secure design decisions.
