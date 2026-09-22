# DeckUp — Remediation Plan (post-review)

| Field  | Value                                                                |
| ------ | -------------------------------------------------------------------- |
| Date   | 2026-09-22                                                           |
| Source | Exhaustive review (lint/typecheck/unit/API e2e 52/52/Playwright 7/7) |
| Scope  | Phases 1–5                                                           |
| Status | **Completed** — all phases executed, verified and committed          |

## Decisions

- D1 Image storage: **Cloudinary only** (domain port + Cloudinary adapter; fake adapter in unit/e2e).
- D2 Scope: Phases 1–4.
- D3 Phase 5: included in full.
- D4 Plan file: `PLAN.md` (repository root).

## Recommended execution order

1. Phase 3.1–3.4 (CI/deploy blockers) — protects every later commit with real CI.
2. Phase 1 (missing functionality).
3. Phase 2 (correctness bugs).
4. Phase 4 (documentation alignment).
5. Phase 5 (optional backlog, complete).

Each task: conventional commit + gates (`lint`, `typecheck`, `test`, API e2e; Playwright before closing a phase).

## Phase 1 — Missing product functionality (P0)

1. **Card images end-to-end** (RF-05, AC-03.1, NFR-03.1/03.3, CU-I, TC-07/08)
   - `domain/ports/image-storage.port.ts`: `upload(input, ownerId)`, `remove(publicId)`.
   - `infrastructure/images/cloudinary-image-storage.adapter.ts`: signed upload/delete via Cloudinary API.
     Env: `IMAGE_STORAGE=cloudinary|disabled`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
     `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER?`. `disabled` → 503 with problem details.
   - Use cases: `UploadCardImageUseCase`, `RemoveCardImageUseCase` (JPEG/PNG magic bytes, ≤5 MB,
     ownership, replace deletes the previous asset, clear `imageUrl`/`imagePublicId`).
   - Endpoints: `POST /cards/:cardId/image` (multipart 5 MB), `DELETE /cards/:cardId/image`;
     keep CSV multipart at 1 MB (per-route limits).
   - Web: file input + preview + remove in `card-form.tsx`; render `imageUrl` in `study-card.tsx`
     and `deck-detail-page.tsx`; upload via `apiUpload` (with refresh, see 2.3).
   - Tests: use-case unit with fake port, Cloudinary adapter spec with mocked fetch, API e2e
     (TC-07/08, 413, ownership) with fake adapter injected, web component test. CI needs no credentials.
2. **Subject filter** in dashboard deck list (AC-02.2/TC-06).
3. **Streak on dashboard** (AC-04.4) reusing the analytics overview query.
4. **Clearable optional fields**: send `null` (not omit) for emptied hint/difficulty/subject/description/color.
5. **Session queue contract**: amend `openapi.yaml` to the live queue; differentiate `AHEAD` (soonest due)
   from `ALL` (every card).

## Phase 2 — Correctness bugs (P0)

1. IANA timezone validation (`updateUserSchema`); align `local-date.ts` fallback; guard analytics SQL.
2. Study keyboard: block while `submitReview.isPending`, ignore `event.repeat`.
3. Single-flight `refreshAccessToken`; refresh-and-retry in `apiUpload` and `apiDownload`.
4. Error handling on deck/card deletion; retry actions in error states; fix infinite spinner.
5. `queryClient.clear()` on sign-out/401; purge SW runtime caches on logout.
6. Pagination for dashboard and explore lists.
7. `path: '*'` NotFound + `errorElement`.
8. Prisma P2002 → 409 on duplicate registration.
9. Env refine: `LLM_PROVIDER=openai` requires `LLM_API_KEY`.
10. Modal: focus trap, `aria-labelledby`, focus restore.
11. Import modal: block re-import, header-only notice, duplicate flagging (E1/E2).

## Phase 3 — Deployability & CI (P0)

1. `deploy.yml`: replace `??` with `||`, add pnpm setup to the API job, run `prisma migrate deploy`
   before `railway up`, gate on CI.
2. `vercel.json`: build workspace deps first (`turbo run build --filter=@deckup/web`).
3. Fresh clone: `prisma generate` on dev/prebuild; `turbo dev.dependsOn: ["^build"]`; document
   `.env` copy and `playwright install`.
4. CI: add API integration job (`pnpm --filter @deckup/api test:e2e`) with postgres service.
5. `turbo.json`: `env`/`globalEnv`; include generated Prisma client in build outputs.
6. `APP_VERSION`: validate + document.
7. Commit `railway.json` (dockerfilePath `apps/api/Dockerfile`, healthcheck `/api/v1/health`).
8. Rewrite README quickstart (NestJS 12, real commands, no placeholders).

## Phase 4 — Documentation alignment (P1)

1. Traceability matrix: RF-05 status, TC-06 UI, US-03 coverage, RF-11/12, TC ID mapping.
2. `test-cases.md`: unique sequential TC IDs aligned with the matrix; fix relative paths.
3. `openapi.yaml`: queue freeze, logout/refresh CSRF, `/decks/public` → PublicDeck, retention vs BR-04.4,
   start-session body, image endpoints/limits.
4. overview/ADR-0002/data-model: Cloudinary reflects reality (implemented in Phase 1).
5. `deployment.md`: migration automation and offline claims corrected.
6. `security.md`/`backup-policy.md`: qualify claims; add `*.dump` to `.gitignore`.
7. Set `Content-Type: application/problem+json` in the exception filter.
8. test-plan counts, scripts README counts, ADR cross-refs, ADR-0005/0006 alignment.

## Phase 5 — Optional backlog (complete)

- NFR-07 request IDs + structured logs.
- Session resume/abandon + ABANDONED lifecycle.
- Review idempotency for offline replay.
- Partial `Deck(visibility) WHERE PUBLIC` index migration.
- Vitest coverage thresholds (ADR-0008).
- Demo seed script.
- a11y scans on authenticated pages.

## Verification (every phase)

```bash
pnpm lint && pnpm typecheck && pnpm test
docker compose up -d db && pnpm --filter @deckup/api test:e2e
pnpm build && pnpm test:e2e
```

Plus: fresh-clone smoke (delete `dist`/generated, run quickstart) and deploy dry-runs when credentials exist.
