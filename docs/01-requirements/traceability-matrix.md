# Traceability Matrix — DeckUp (Epic 03)

| Field       | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| **Version** | 1.0                                                                    |
| **Date**    | 2026-09-22                                                             |
| **Source**  | [`user-story-refinement.md`](./user-story-refinement.md)               |
| **Method**  | SWEBOK V4.0a, KA01 §7.3 — traceability: origin → design → tests → code |

The matrix links every requirement to its origin (epic and user story), its design
(use case) and its verification (test case).

---

## 1. Functional requirements

| ID        | Requirement                                               | Origin | Priority | Phase |
| --------- | --------------------------------------------------------- | ------ | -------- | ----- |
| **RF-01** | Register, sign in and manage a student account (enabling) | Epic   | Must     | 2     |
| **RF-02** | Create a flashcard deck                                   | US-01  | Must     | 2     |
| **RF-03** | Organize decks: subject, description, tags, visibility    | US-02  | Must     | 2     |
| **RF-04** | Author cards: front/back text, edit and delete            | US-02  | Must     | 2     |
| **RF-05** | Enrich cards: image, hint, difficulty, tags               | US-03  | Should   | 3     |
| **RF-06** | Import cards in bulk from CSV with per-row validation     | US-03  | Should   | 3     |
| **RF-07** | Export a deck to CSV                                      | Epic   | Could    | 6     |
| **RF-08** | Build the daily study queue from due cards                | US-04  | Must     | 3     |
| **RF-09** | Schedule reviews with FSRS using four ratings             | US-04  | Must     | 3     |
| **RF-10** | Study analytics: streak, retention and 7-day forecast     | US-04  | Must     | 5     |
| **RF-11** | Discover and clone public decks                           | Epic   | Could    | 8     |
| **RF-12** | Generate cards from notes with AI assistance              | Epic   | Could    | 8     |

## 2. Use case catalog

| ID    | Use case                    | Primary actor | Relates to   |
| ----- | --------------------------- | ------------- | ------------ |
| CU#01 | Register account            | Student       | RF-01        |
| CU#02 | Sign in                     | Student       | RF-01        |
| CU#03 | Create deck                 | Student       | RF-02        |
| CU#04 | Organize deck               | Student       | RF-03        |
| CU#05 | Add card                    | Student       | RF-04        |
| CU#06 | Enrich card                 | Student       | RF-05        |
| CU#07 | Import cards from CSV       | Student       | RF-06        |
| CU#08 | Study deck                  | Student       | RF-08, RF-09 |
| CU#09 | View study analytics        | Student       | RF-10        |
| CU#10 | Export deck                 | Student       | RF-07        |
| CU#11 | Browse public decks         | Student       | RF-11        |
| CU#12 | Generate cards with AI      | Student       | RF-12        |
| CU-V  | Validate CSV file           | — (included)  | CU#07        |
| CU-I  | Store card image            | — (included)  | CU#06        |
| CU-Q  | Build daily study queue     | — (included)  | CU#08        |
| CU-S  | Schedule next review (FSRS) | — (included)  | CU#08        |
| CU-E  | Aggregate review statistics | — (included)  | CU#09        |
| CU-R  | Review ahead of schedule    | — (extending) | CU#08        |

Diagram: [`../02-architecture/use-case-diagram.puml`](../02-architecture/use-case-diagram.puml).

## 3. Requirement traceability matrix

| Requirement | User story | Use case     | Test cases                 | Status                                                                   |
| ----------- | ---------- | ------------ | -------------------------- | ------------------------------------------------------------------------ |
| RF-01       | Epic       | CU#01, CU#02 | TC-A1 … TC-A4              | Implemented (Phases 2–4)                                                 |
| RF-02       | US-01      | CU#03        | TC-01, TC-02               | Implemented (Phases 2–4)                                                 |
| RF-03       | US-02      | CU#04        | TC-05, TC-06               | Implemented (Phases 2–4)                                                 |
| RF-04       | US-02      | CU#05        | TC-03, TC-04               | Implemented (Phases 2–4)                                                 |
| RF-05       | US-03      | CU#06 (CU-I) | TC-07 … TC-10              | Partial — hint, difficulty and tags done; image upload pending (Phase 3) |
| RF-06       | US-03      | CU#07 (CU-V) | TC-11 … TC-14              | Implemented (Phase 6)                                                    |
| RF-07       | Epic       | CU#10        | TC-27, TC-28               | Implemented (Phase 6)                                                    |
| RF-08       | US-04      | CU#08 (CU-Q) | TC-15, TC-16, TC-24        | Implemented (Phase 3)                                                    |
| RF-09       | US-04      | CU#08 (CU-S) | TC-17, TC-18, TC-25, TC-26 | Implemented (Phase 3)                                                    |
| RF-10       | US-04      | CU#09 (CU-E) | TC-19 … TC-23              | Implemented (Phase 5)                                                    |
| RF-11       | Epic       | CU#11        | TC-29, TC-30               | Phase 8                                                                  |
| RF-12       | Epic       | CU#12        | TC-31, TC-32               | Phase 8                                                                  |

### 3.1 Automated coverage status (Phases 2–4)

| Suite                        | File                                                               | Covers                                                    |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Domain unit                  | `apps/api/src/domain/**/*.spec.ts`                                 | Entity and value-object rules                             |
| Application unit             | `apps/api/src/application/auth/*.spec.ts`                          | Registration and refresh rotation (incl. reuse detection) |
| API integration (auth)       | `apps/api/test/auth.e2e-spec.ts`                                   | TC-A1 … TC-A4, profile, CSRF, logout                      |
| API integration (decks)      | `apps/api/test/decks.e2e-spec.ts`                                  | TC-01, TC-05, TC-06, ownership isolation, soft delete     |
| API integration (cards)      | `apps/api/test/cards.e2e-spec.ts`                                  | TC-03, TC-04, TC-09, ownership isolation                  |
| API integration (throttling) | `apps/api/test/throttling.e2e-spec.ts`                             | Brute-force protection (429)                              |
| API integration (health)     | `apps/api/test/app.e2e-spec.ts`                                    | Operational health endpoint                               |
| API integration (study)      | `apps/api/test/study.e2e-spec.ts`                                  | TC-15 … TC-19, TC-24, TC-25, review-ahead mode, isolation |
| Scheduling unit              | `apps/api/src/infrastructure/scheduling/ts-fsrs.scheduler.spec.ts` | FSRS transitions for the four ratings                     |
| Metrics unit                 | `apps/api/src/domain/services/study-metrics.service.spec.ts`       | Streak, retention and forecast rules                      |
| Import unit                  | `apps/api/src/application/cards/import-cards.use-case.spec.ts`     | CSV edge cases, row reporting and limits                  |
| API integration (analytics)  | `apps/api/test/analytics.e2e-spec.ts`                              | TC-20 … TC-23, empty state, window validation             |
| API integration (imports)    | `apps/api/test/imports.e2e-spec.ts`                                | TC-11 … TC-14, TC-27, TC-28, 413 and isolation            |
| Web unit (API client)        | `apps/web/src/lib/api-client.test.ts`                              | Bearer header, refresh-and-retry on 401, problem details  |
| Web component (auth)         | `apps/web/src/features/auth/login-page.test.tsx`                   | Sign-in form, validation and credentials POST             |
| Web component (decks)        | `apps/web/src/features/decks/deck-form.test.tsx`                   | Deck form validation, tag parsing and edit prefill        |
| Web component (landing)      | `apps/web/src/features/landing/landing-page.test.tsx`              | Landing content and anonymous calls to action             |
| Web component (study)        | `apps/web/src/features/study/study-session-page.test.tsx`          | Queue walk-through, keyboard shortcuts, empty state       |
| Web component (analytics)    | `apps/web/src/features/analytics/analytics-page.test.tsx`          | Metrics cards, forecast section, error state              |
| Web component (import)       | `apps/web/src/features/decks/import-cards-modal.test.tsx`          | File upload, import summary and validation errors         |
| Web e2e (Playwright)         | `e2e/smoke.spec.ts`                                                | Landing, login form and protected-route redirect          |

## 4. Test case catalog

| ID    | Test case                                              | Requirement |
| ----- | ------------------------------------------------------ | ----------- |
| TC-A1 | Register with a valid email and password               | RF-01       |
| TC-A2 | Reject duplicate email registration                    | RF-01       |
| TC-A3 | Sign in with valid credentials                         | RF-01       |
| TC-A4 | Reject sign in with wrong password                     | RF-01       |
| TC-01 | Deck creation persists and appears in the deck list    | RF-02       |
| TC-02 | Deck remains visible after signing out and back in     | RF-02       |
| TC-03 | Add a card with non-empty front and back text          | RF-04       |
| TC-04 | Edit the front/back text of an existing card           | RF-04       |
| TC-05 | Assign subject and tags to a deck                      | RF-03       |
| TC-06 | Filter the deck list by subject                        | RF-03       |
| TC-07 | Attach a JPEG/PNG image of at most 5 MB to a card      | RF-05       |
| TC-08 | Reject an image with an invalid type or excessive size | RF-05       |
| TC-09 | Persist hint and difficulty level on a card            | RF-05       |
| TC-10 | Show the hint during a study session                   | RF-05       |
| TC-11 | Import a valid CSV with 1 000 rows                     | RF-06       |
| TC-12 | Report imported row count in the import summary        | RF-06       |
| TC-13 | Skip malformed rows and report their row numbers       | RF-06       |
| TC-14 | Reject an import file above the size limit             | RF-06       |
| TC-15 | Queue contains only cards due today or earlier         | RF-08       |
| TC-16 | Queue is ordered by due date, oldest first             | RF-08       |
| TC-17 | Rating Again moves the card to the relearning step     | RF-09       |
| TC-18 | Rating Good/Easy produces longer FSRS intervals        | RF-09       |
| TC-19 | Session summary shows reviewed, accuracy and time      | RF-10       |
| TC-20 | Streak increments after reviewing on a consecutive day | RF-10       |
| TC-21 | Streak resets after a day without reviews              | RF-10       |
| TC-22 | Retention metric computed over the last 30 days        | RF-10       |
| TC-23 | 7-day workload forecast matches scheduled due dates    | RF-10       |
| TC-24 | Empty queue shows the study-ahead empty state          | RF-08       |
| TC-25 | Ratings persist when the session is interrupted        | RF-09       |
| TC-26 | Due dates respect the student's local timezone         | RF-09       |
| TC-27 | Export a deck to a valid CSV file                      | RF-07       |
| TC-28 | Exported CSV re-imports without data loss              | RF-07       |
| TC-29 | Browse the public deck catalog                         | RF-11       |
| TC-30 | Clone a public deck into the student's account         | RF-11       |
| TC-31 | Generate card suggestions from pasted notes            | RF-12       |
| TC-32 | Reject AI generation for empty or oversized input      | RF-12       |

Detailed test design (preconditions, steps, expected results) lives in
[`../03-testing/test-cases.md`](../03-testing/test-cases.md).

## 5. Coverage summary

| User story | Requirements        | Use cases           | Test cases | Coverage |
| ---------- | ------------------- | ------------------- | ---------- | -------- |
| US-01      | RF-02               | CU#03               | 2          | 100 %    |
| US-02      | RF-03, RF-04        | CU#04, CU#05        | 4          | 100 %    |
| US-03      | RF-05, RF-06        | CU#06, CU#07        | 8          | 100 %    |
| US-04      | RF-08, RF-09, RF-10 | CU#08, CU#09        | 12         | 100 %    |
| Epic       | RF-01, RF-07        | CU#01, CU#02, CU#10 | 6          | 100 %    |
| Phase 8    | RF-11, RF-12        | CU#11, CU#12        | 4          | Deferred |

Every Must/Should requirement is covered by at least one test case; no orphan
requirements and no orphan test cases exist in this baseline.

## 6. SWEBOK V4.0a references

- Cap. 1, §7.3 — _Traceability_: linking requirements to origin, design and tests.
- Cap. 5, §2 — _Test levels and traceability to requirements_.
