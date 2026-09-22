# Test Cases — DeckUp

| Field       | Value                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                                                         |
| **Date**    | 2026-09-22                                                                                                                  |
| **Related** | [`test-plan.md`](./test-plan.md) · [`../01-requirements/traceability-matrix.md`](../01-requirements/traceability-matrix.md) |

Steps are condensed; the **Automated in** column points to the suite that
executes the case on every push.

---

## 1. Accounts and authentication

| ID    | Preconditions     | Steps                                          | Expected                                           | Automated in                  |
| ----- | ----------------- | ---------------------------------------------- | -------------------------------------------------- | ----------------------------- |
| TC-A1 | No account        | Register with email, name and password ≥ 10    | `201`, access token returned, refresh cookie set   | `test/auth.e2e-spec.ts`       |
| TC-A2 | Existing account  | Register again with the same email             | `409` problem+json, no second account created      | `test/auth.e2e-spec.ts`       |
| TC-A3 | Existing account  | Sign in with correct credentials               | `200`, access token, cookie rotated                | `test/auth.e2e-spec.ts`       |
| TC-A4 | Existing account  | Sign in with a wrong password                  | `401` with a generic message (no user enumeration) | `test/auth.e2e-spec.ts`       |
| TC-A5 | Signed-in student | Call `GET /users/me` without a token           | `401`                                              | `test/auth.e2e-spec.ts`       |
| TC-A6 | Signed-in student | Refresh, then reuse the previous refresh token | `401` and the whole token family is revoked        | `test/auth.e2e-spec.ts`       |
| TC-A7 | Signed-in student | Refresh without the `X-Requested-With` header  | `401` (CSRF guard)                                 | `test/auth.e2e-spec.ts`       |
| TC-A8 | 12 login attempts | Burst `POST /auth/login` from the same IP      | At least one `429`                                 | `test/throttling.e2e-spec.ts` |

## 2. Decks

| ID    | Preconditions     | Steps                                 | Expected                                          | Automated in             |
| ----- | ----------------- | ------------------------------------- | ------------------------------------------------- | ------------------------ |
| TC-01 | Signed-in student | Create a deck with a title            | `201`, deck listed in `GET /decks`                | `test/decks.e2e-spec.ts` |
| TC-02 | Deck created      | Reload the session and list decks     | Deck still present (persistence)                  | `test/decks.e2e-spec.ts` |
| TC-05 | Deck created      | Patch subject, visibility and tags    | Tags trimmed, lower-cased and deduplicated        | `test/decks.e2e-spec.ts` |
| TC-06 | Two decks         | Filter by `subject`                   | Only matching decks returned, `total` correct     | `test/decks.e2e-spec.ts` |
| TC-07 | Deck owned by A   | B reads, patches and deletes A's deck | `404` for every attempt (ownership isolation)     | `test/decks.e2e-spec.ts` |
| TC-08 | Deck with cards   | Delete the deck                       | `204`, deck and its cards disappear from listings | `test/decks.e2e-spec.ts` |
| TC-09 | Signed-in student | Send an empty title and a bad colour  | `422` with field errors                           | `test/decks.e2e-spec.ts` |

## 3. Cards

| ID    | Preconditions   | Steps                                      | Expected                                    | Automated in             |
| ----- | --------------- | ------------------------------------------ | ------------------------------------------- | ------------------------ |
| TC-03 | Deck owned by A | Add a card with front and back             | `201`, card listed in the deck              | `test/cards.e2e-spec.ts` |
| TC-04 | Card exists     | Patch back text, difficulty and clear hint | `200`, values persisted (`hint: null`)      | `test/cards.e2e-spec.ts` |
| TC-09 | Card exists     | Add hint, difficulty and tags              | Tags normalised; hint and difficulty stored | `test/cards.e2e-spec.ts` |
| TC-10 | Card exists     | Submit an empty front                      | `422`                                       | `test/cards.e2e-spec.ts` |
| TC-11 | Card owned by A | B reads, patches and deletes A's card      | `404` for every attempt                     | `test/cards.e2e-spec.ts` |
| TC-12 | Card in a deck  | Search cards by text                       | Only matching cards returned                | `test/cards.e2e-spec.ts` |

## 4. Study engine

| ID    | Preconditions          | Steps                                    | Expected                                                  | Automated in                                              |
| ----- | ---------------------- | ---------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| TC-15 | Deck with 2 new cards  | Start a `DUE` session and read the queue | Queue has exactly the due cards, `isNew: true`            | `test/study.e2e-spec.ts`                                  |
| TC-16 | Queue built            | Inspect the order                        | Ordered by due date, oldest first                         | `src/infrastructure/scheduling/ts-fsrs.scheduler.spec.ts` |
| TC-17 | New card in session    | Rate `AGAIN`                             | State `LEARNING`, due within minutes, `reps` incremented  | `ts-fsrs.scheduler.spec.ts`                               |
| TC-18 | New card in session    | Rate `EASY`                              | Graduates to `REVIEW` with an interval ≥ 1 day            | `ts-fsrs.scheduler.spec.ts`                               |
| TC-19 | Session finished       | Complete the session                     | Summary with reviewed, correct, accuracy and elapsed time | `test/study.e2e-spec.ts`                                  |
| TC-24 | Nothing due            | Open study mode                          | Empty state offering “review ahead” and “review all”      | `study-session-page.test.tsx`                             |
| TC-25 | Cards rated `EASY`     | Start a `DUE` session                    | Queue empty; `AHEAD` session returns the scheduled cards  | `test/study.e2e-spec.ts`                                  |
| TC-26 | Card from another deck | Submit a review for it                   | `404` (card not in the session deck)                      | `test/study.e2e-spec.ts`                                  |
| TC-27 | Completed session      | Read the queue again                     | `409` (session no longer active)                          | `test/study.e2e-spec.ts`                                  |

## 5. Analytics

| ID    | Preconditions                 | Steps                          | Expected                                                     | Automated in                    |
| ----- | ----------------------------- | ------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| TC-20 | Reviews on consecutive days   | Read `GET /analytics/overview` | Streak counts consecutive local days (unit-tested rule)      | `study-metrics.service.spec.ts` |
| TC-21 | A day without reviews         | Read `GET /analytics/overview` | Streak resets to zero after a full gap                       | `study-metrics.service.spec.ts` |
| TC-22 | Session with `GOOD` + `AGAIN` | Read `GET /analytics/overview` | `retention30d = 0.5`, `reviewsToday = 2`                     | `test/analytics.e2e-spec.ts`    |
| TC-23 | Scheduled cards               | Read `GET /analytics/forecast` | Seven zero-filled days; today aggregates overdue + due cards | `test/analytics.e2e-spec.ts`    |
| TC-28 | Fresh account                 | Read both analytics endpoints  | All metrics zero; forecast with seven empty days             | `test/analytics.e2e-spec.ts`    |

## 6. Import and export

| ID    | Preconditions            | Steps                                  | Expected                                                | Automated in                    |
| ----- | ------------------------ | -------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| TC-11 | Deck owned by A          | Import a valid CSV (quotes, tags)      | `imported` equals the valid row count, cards created    | `imports.e2e-spec.ts`           |
| TC-12 | CSV with BOM + CRLF      | Import                                 | Parsed correctly, no header artefacts                   | `import-cards.use-case.spec.ts` |
| TC-13 | CSV with a malformed row | Import                                 | Row skipped with its line number; valid rows imported   | `imports.e2e-spec.ts`           |
| TC-14 | CSV > 1 MB               | Upload                                 | `413`                                                   | `imports.e2e-spec.ts`           |
| TC-15 | CSV without `back`       | Import                                 | `422` explaining the missing column                     | `imports.e2e-spec.ts`           |
| TC-27 | Deck with cards          | Export and re-import into another deck | Round trip without data loss; `Content-Disposition` set | `imports.e2e-spec.ts`           |
| TC-28 | Deck owned by A          | B imports/exports A's deck             | `404` for both operations                               | `imports.e2e-spec.ts`           |

## 7. Cross-cutting

| ID    | Area          | Case                                                     | Expected                                        | Automated in                |
| ----- | ------------- | -------------------------------------------------------- | ----------------------------------------------- | --------------------------- |
| TC-30 | Accessibility | axe scan on `/`, `/login`, `/register`                   | No serious or critical WCAG 2.1 A/AA violations | `e2e/a11y.spec.ts`          |
| TC-31 | UX            | Full journey: register → deck → card → study → analytics | Every screen reachable and consistent           | `e2e/study-journey.spec.ts` |
| TC-32 | Session       | Access a protected route while anonymous                 | Redirect to `/login` preserving the target      | `e2e/smoke.spec.ts`         |
| TC-33 | API client    | Access token expired while calling the API               | Silent refresh, one retry, request succeeds     | `api-client.test.ts`        |
| TC-34 | Operations    | `GET /health`                                            | `200` with service name, version and uptime     | `test/app.e2e-spec.ts`      |
