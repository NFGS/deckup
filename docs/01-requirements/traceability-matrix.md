# Traceability Matrix — DeckUp (Epic 03)

| Field       | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| **Version** | 1.1                                                                    |
| **Date**    | 2026-09-22                                                             |
| **Source**  | [`user-story-refinement.md`](./user-story-refinement.md)               |
| **Method**  | SWEBOK V4.0a, KA01 §7.3 — traceability: origin → design → tests → code |

The matrix links every requirement to its origin (epic and user story), its design
(use case) and its verification (test case). Test-case IDs are unique and match
[`../03-testing/test-cases.md`](../03-testing/test-cases.md).

---

## 1. Functional requirements

| ID        | Requirement                                               | Origin | Priority | Phase |
| --------- | --------------------------------------------------------- | ------ | -------- | ----- |
| **RF-01** | Register, sign in and manage a student account (enabling) | Epic   | Must     | 2     |
| **RF-02** | Create a flashcard deck                                   | US-01  | Must     | 2     |
| **RF-03** | Organize decks: subject, description, tags, visibility    | US-02  | Must     | 2     |
| **RF-04** | Author cards: front/back text, edit and delete            | US-02  | Must     | 2     |
| **RF-05** | Enrich cards: image, hint, difficulty, tags               | US-03  | Should   | 3, 9  |
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

| Requirement | User story | Use case     | Test cases                    | Status      |
| ----------- | ---------- | ------------ | ----------------------------- | ----------- |
| RF-01       | Epic       | CU#01, CU#02 | TC-A1 … TC-A9                 | Implemented |
| RF-02       | US-01      | CU#03        | TC-D1, TC-D2                  | Implemented |
| RF-03       | US-02      | CU#04        | TC-D3 … TC-D8                 | Implemented |
| RF-04       | US-02      | CU#05        | TC-C1 … TC-C6                 | Implemented |
| RF-05       | US-03      | CU#06 (CU-I) | TC-C3, TC-C7 … TC-C11         | Implemented |
| RF-06       | US-03      | CU#07 (CU-V) | TC-I1 … TC-I5, TC-I8, TC-I9   | Implemented |
| RF-07       | Epic       | CU#10        | TC-I6, TC-I7                  | Implemented |
| RF-08       | US-04      | CU#08 (CU-Q) | TC-S1, TC-S2, TC-S6, TC-S7    | Implemented |
| RF-09       | US-04      | CU#08 (CU-S) | TC-S2 … TC-S5, TC-S8 … TC-S12 | Implemented |
| RF-10       | US-04      | CU#09 (CU-E) | TC-N1 … TC-N5                 | Implemented |
| RF-11       | Epic       | CU#11        | TC-P1, TC-P2                  | Implemented |
| RF-12       | Epic       | CU#12        | TC-P3, TC-P4                  | Implemented |

### 3.1 Automated coverage status

| Suite                        | File                                                               | Covers                                                    |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Domain unit                  | `apps/api/src/domain/**/*.spec.ts`                                 | Entities, value objects, scheduling and metrics rules     |
| Application unit             | `apps/api/src/application/**/*.spec.ts`                            | Auth, CSV import and card image use cases                 |
| API integration (auth)       | `apps/api/test/auth.e2e-spec.ts`                                   | TC-A1 … TC-A7, TC-A9, profile, CSRF, logout               |
| API integration (decks)      | `apps/api/test/decks.e2e-spec.ts`                                  | TC-D1 … TC-D7, ownership isolation, soft delete           |
| API integration (cards)      | `apps/api/test/cards.e2e-spec.ts`                                  | TC-C1 … TC-C6, ownership isolation                        |
| API integration (images)     | `apps/api/test/images.e2e-spec.ts`                                 | TC-C7 … TC-C9, TC-C11, 413/422, isolation                 |
| API integration (throttling) | `apps/api/test/throttling.e2e-spec.ts`                             | TC-A8 (brute-force protection)                            |
| API integration (health)     | `apps/api/test/app.e2e-spec.ts`                                    | TC-X6, TC-X7 (health and request ids)                     |
| API integration (study)      | `apps/api/test/study.e2e-spec.ts`                                  | TC-S1, TC-S5, TC-S7 … TC-S12                              |
| Scheduling unit              | `apps/api/src/infrastructure/scheduling/ts-fsrs.scheduler.spec.ts` | TC-S2, TC-S3, TC-S4 (FSRS transitions)                    |
| Metrics unit                 | `apps/api/src/domain/services/study-metrics.service.spec.ts`       | TC-N1, TC-N2 (streak, retention, forecast rules)          |
| Import unit                  | `apps/api/src/application/cards/import-cards.use-case.spec.ts`     | TC-I2, TC-I3, TC-I8, TC-I9 and limits                     |
| API integration (analytics)  | `apps/api/test/analytics.e2e-spec.ts`                              | TC-N3 … TC-N5, empty state, window validation             |
| API integration (imports)    | `apps/api/test/imports.e2e-spec.ts`                                | TC-I1, TC-I3 … TC-I7                                      |
| API integration (public)     | `apps/api/test/public-decks.e2e-spec.ts`                           | TC-P1, TC-P2, catalogue filters and isolation             |
| AI generation (unit)         | `apps/api/src/infrastructure/ai/openai-card-generator.spec.ts`     | TC-P3 (provider parsing, trimming, failure modes)         |
| AI generation (e2e)          | `apps/api/test/ai.e2e-spec.ts`                                     | TC-P4 (disabled provider, validation)                     |
| Web unit (API client)        | `apps/web/src/lib/api-client.test.ts`                              | TC-X5 (Bearer header, refresh-and-retry, problem details) |
| Web unit (offline queue)     | `apps/web/src/lib/offline-queue.test.ts`                           | TC-X8 (queueing, replay and failure retention)            |
| Web component (auth)         | `apps/web/src/features/auth/login-page.test.tsx`                   | Sign-in form, validation and credentials POST             |
| Web component (decks)        | `apps/web/src/features/decks/deck-form.test.tsx`                   | Deck form validation, tag parsing and edit prefill        |
| Web component (dashboard)    | `apps/web/src/features/decks/dashboard-page.test.tsx`              | TC-D8 (subject filter, streak)                            |
| Web component (landing)      | `apps/web/src/features/landing/landing-page.test.tsx`              | Landing content and anonymous calls to action             |
| Web component (study)        | `apps/web/src/features/study/study-session-page.test.tsx`          | TC-S6, TC-C10, keyboard shortcuts, offline queueing       |
| Web component (analytics)    | `apps/web/src/features/analytics/analytics-page.test.tsx`          | Metrics cards, forecast section, error state              |
| Web component (import)       | `apps/web/src/features/decks/import-cards-modal.test.tsx`          | File upload, import summary and validation errors         |
| Web component (explore)      | `apps/web/src/features/explore/explore-page.test.tsx`              | Catalogue listing and cloning                             |
| Web component (AI)           | `apps/web/src/features/ai/generate-cards-modal.test.tsx`           | Suggestions, selection and provider errors                |
| Web e2e (Playwright)         | `e2e/smoke.spec.ts`, `e2e/study-journey.spec.ts`                   | TC-X3, TC-X4 (journey and protected-route redirect)       |
| Web e2e (accessibility)      | `e2e/a11y.spec.ts`                                                 | TC-X1, TC-X2 (public and authenticated scans)             |

## 4. Test case catalog

| ID     | Test case                                              | Requirement |
| ------ | ------------------------------------------------------ | ----------- |
| TC-A1  | Register with a valid email and password               | RF-01       |
| TC-A2  | Reject duplicate email registration                    | RF-01       |
| TC-A3  | Sign in with valid credentials                         | RF-01       |
| TC-A4  | Reject sign in with wrong password                     | RF-01       |
| TC-A5  | Reject private routes without a token                  | RF-01       |
| TC-A6  | Detect refresh-token reuse and revoke the family       | RF-01       |
| TC-A7  | Reject cookie endpoints without the CSRF header        | RF-01       |
| TC-A8  | Throttle brute-force login attempts                    | RF-01       |
| TC-A9  | Reject an invalid IANA timezone                        | RF-01       |
| TC-D1  | Deck creation persists and appears in the deck list    | RF-02       |
| TC-D2  | Deck remains visible after signing out and back in     | RF-02       |
| TC-D3  | Assign subject and tags to a deck                      | RF-03       |
| TC-D4  | Filter the deck list by subject (API)                  | RF-03       |
| TC-D5  | Isolate decks between students                         | RF-03       |
| TC-D6  | Deleting a deck removes its cards                      | RF-03       |
| TC-D7  | Reject invalid deck payloads                           | RF-03       |
| TC-D8  | Filter the dashboard by subject and show the streak    | RF-03       |
| TC-C1  | Add a card with non-empty front and back text          | RF-04       |
| TC-C2  | Edit a card and clear optional fields                  | RF-04       |
| TC-C3  | Persist hint, difficulty and tags                      | RF-05       |
| TC-C4  | Reject an empty card face                              | RF-04       |
| TC-C5  | Isolate cards between students                         | RF-04       |
| TC-C6  | Search cards by text                                   | RF-04       |
| TC-C7  | Attach a JPEG/PNG image of at most 5 MB                | RF-05       |
| TC-C8  | Reject an image with an invalid type or excessive size | RF-05       |
| TC-C9  | Replace and remove a card image                        | RF-05       |
| TC-C10 | Show the card image during a study session             | RF-05       |
| TC-C11 | Answer 503 when image storage is not configured        | RF-05       |
| TC-S1  | Queue contains only cards due today or earlier         | RF-08       |
| TC-S2  | Ratings produce ordered FSRS intervals                 | RF-09       |
| TC-S3  | Rating Again keeps the card in relearning              | RF-09       |
| TC-S4  | Rating Good/Easy produces longer FSRS intervals        | RF-09       |
| TC-S5  | Session summary shows reviewed, accuracy and time      | RF-10       |
| TC-S6  | Empty queue shows the study-ahead empty state          | RF-08       |
| TC-S7  | Review ahead returns scheduled cards                   | RF-08       |
| TC-S8  | Reject reviews for cards outside the session deck      | RF-09       |
| TC-S9  | Reject queue access after completion                   | RF-09       |
| TC-S10 | Resume the active session for a deck and mode          | RF-09       |
| TC-S11 | Abandon a session and block further work on it         | RF-09       |
| TC-S12 | Replayed reviews are idempotent                        | RF-09       |
| TC-N1  | Streak increments on consecutive local days            | RF-10       |
| TC-N2  | Streak resets after a day without reviews              | RF-10       |
| TC-N3  | Retention metric computed over the last 30 days        | RF-10       |
| TC-N4  | 7-day workload forecast matches scheduled due dates    | RF-10       |
| TC-N5  | Fresh accounts see zeroed analytics                    | RF-10       |
| TC-I1  | Import a valid CSV                                     | RF-06       |
| TC-I2  | Import a UTF-8 BOM CSV with CRLF endings               | RF-06       |
| TC-I3  | Skip malformed rows and report their row numbers       | RF-06       |
| TC-I4  | Reject an import file above the size limit             | RF-06       |
| TC-I5  | Reject a CSV without required columns                  | RF-06       |
| TC-I6  | Export a deck to a valid CSV file                      | RF-07       |
| TC-I7  | Isolate imports and exports between students           | RF-07       |
| TC-I8  | Flag duplicated CSV rows in the summary                | RF-06       |
| TC-I9  | Accept a header-only CSV with a notice                 | RF-06       |
| TC-P1  | Browse the public deck catalog                         | RF-11       |
| TC-P2  | Clone a public deck into the student's account         | RF-11       |
| TC-P3  | Generate card suggestions from pasted notes            | RF-12       |
| TC-P4  | Reject AI generation when the provider is disabled     | RF-12       |
| TC-X1  | Public pages pass the WCAG 2.1 A/AA scan               | NFR-03      |
| TC-X2  | Authenticated screens and dialogs pass the scan        | NFR-03      |
| TC-X3  | Full journey: register → deck → card → study           | All         |
| TC-X4  | Protected routes redirect anonymous visitors           | RF-01       |
| TC-X5  | Expired access token triggers a silent refresh         | NFR-01      |
| TC-X6  | Health endpoint reports service, version and uptime    | NFR-07      |
| TC-X7  | Requests carry a correlation id                        | NFR-07      |
| TC-X8  | Offline reviews are queued and replayed once           | NFR-05      |

## 5. Coverage summary

| User story | Requirements        | Use cases     | Test cases | Coverage |
| ---------- | ------------------- | ------------- | ---------- | -------- |
| US-01      | RF-02               | CU#03         | 2          | 100 %    |
| US-02      | RF-03, RF-04        | CU#04, CU#05  | 14         | 100 %    |
| US-03      | RF-05, RF-06        | CU#06, CU#07  | 16         | 100 %    |
| US-04      | RF-08, RF-09, RF-10 | CU#08, CU#09  | 17         | 100 %    |
| Epic       | RF-01, RF-07        | CU#01 … CU#10 | 18         | 100 %    |
| Phase 8    | RF-11, RF-12        | CU#11, CU#12  | 4          | 100 %    |

Every Must/Should requirement is covered by at least one test case; no orphan
requirements and no orphan test cases exist in this baseline.

## 6. SWEBOK V4.0a references

- Cap. 1, §7.3 — _Traceability_: linking requirements to origin, design and tests.
- Cap. 5, §2 — _Test levels and traceability to requirements_.
