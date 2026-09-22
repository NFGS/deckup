# Test Cases — DeckUp

| Field       | Value                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 1.1                                                                                                                         |
| **Date**    | 2026-09-22                                                                                                                  |
| **Related** | [`test-plan.md`](./test-plan.md) · [`../01-requirements/traceability-matrix.md`](../01-requirements/traceability-matrix.md) |

Test-case IDs are unique across the document (`TC-<area><n>`). Steps are
condensed; the **Automated in** column points to the suite that executes the
case on every push.

---

## 1. Accounts and authentication (`TC-A`)

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
| TC-A9 | Signed-in student | Patch the profile with an invalid timezone     | `422` (IANA validation)                            | `test/auth.e2e-spec.ts`       |

## 2. Decks (`TC-D`)

| ID    | Preconditions     | Steps                                 | Expected                                          | Automated in              |
| ----- | ----------------- | ------------------------------------- | ------------------------------------------------- | ------------------------- |
| TC-D1 | Signed-in student | Create a deck with a title            | `201`, deck listed in `GET /decks`                | `test/decks.e2e-spec.ts`  |
| TC-D2 | Deck created      | Reload the session and list decks     | Deck still present (persistence)                  | `test/decks.e2e-spec.ts`  |
| TC-D3 | Deck created      | Patch subject, visibility and tags    | Tags trimmed, lower-cased and deduplicated        | `test/decks.e2e-spec.ts`  |
| TC-D4 | Two decks         | Filter by `subject`                   | Only matching decks returned, `total` correct     | `test/decks.e2e-spec.ts`  |
| TC-D5 | Deck owned by A   | B reads, patches and deletes A's deck | `404` for every attempt (ownership isolation)     | `test/decks.e2e-spec.ts`  |
| TC-D6 | Deck with cards   | Delete the deck                       | `204`, deck and its cards disappear from listings | `test/decks.e2e-spec.ts`  |
| TC-D7 | Signed-in student | Send an empty title and a bad colour  | `422` with field errors                           | `test/decks.e2e-spec.ts`  |
| TC-D8 | Two decks, streak | Filter the dashboard by subject       | Only matching cards shown; streak visible         | `dashboard-page.test.tsx` |

## 3. Cards and images (`TC-C`)

| ID     | Preconditions   | Steps                                       | Expected                                    | Automated in                  |
| ------ | --------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------- |
| TC-C1  | Deck owned by A | Add a card with front and back              | `201`, card listed in the deck              | `test/cards.e2e-spec.ts`      |
| TC-C2  | Card exists     | Patch back text, difficulty and clear hint  | `200`, values persisted (`hint: null`)      | `test/cards.e2e-spec.ts`      |
| TC-C3  | Card exists     | Add hint, difficulty and tags               | Tags normalised; hint and difficulty stored | `test/cards.e2e-spec.ts`      |
| TC-C4  | Card exists     | Submit an empty front                       | `422`                                       | `test/cards.e2e-spec.ts`      |
| TC-C5  | Card owned by A | B reads, patches and deletes A's card       | `404` for every attempt                     | `test/cards.e2e-spec.ts`      |
| TC-C6  | Card in a deck  | Search cards by text                        | Only matching cards returned                | `test/cards.e2e-spec.ts`      |
| TC-C7  | Card owned by A | Upload a JPEG or PNG of at most 5 MB        | `201`, `imageUrl` returned and persisted    | `test/images.e2e-spec.ts`     |
| TC-C8  | Card owned by A | Upload a non-image or a file above 5 MB     | `422` / `413`; no asset stored              | `test/images.e2e-spec.ts`     |
| TC-C9  | Card with image | Upload a replacement, then remove the image | Previous asset deleted; references cleared  | `test/images.e2e-spec.ts`     |
| TC-C10 | Card with image | Open the study session                      | The image is rendered on the card           | `study-session-page.test.tsx` |
| TC-C11 | No storage      | Upload with `IMAGE_STORAGE=disabled`        | `503` with problem details                  | `test/images.e2e-spec.ts`     |

## 4. Study engine (`TC-S`)

| ID     | Preconditions          | Steps                                    | Expected                                                     | Automated in                  |
| ------ | ---------------------- | ---------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| TC-S1  | Deck with 2 new cards  | Start a `DUE` session and read the queue | Queue has exactly the due cards, `isNew: true`               | `test/study.e2e-spec.ts`      |
| TC-S2  | New cards in a session | Rate `AGAIN`, `HARD`, `GOOD` and `EASY`  | Intervals ordered Easy > Good > Hard; queue sorts by `dueAt` | `ts-fsrs.scheduler.spec.ts`   |
| TC-S3  | New card in session    | Rate `AGAIN`                             | State `LEARNING`, due within minutes, `reps` incremented     | `ts-fsrs.scheduler.spec.ts`   |
| TC-S4  | New card in session    | Rate `EASY`                              | Graduates to `REVIEW` with an interval ≥ 1 day               | `ts-fsrs.scheduler.spec.ts`   |
| TC-S5  | Session finished       | Complete the session                     | Summary with reviewed, correct, accuracy and elapsed time    | `test/study.e2e-spec.ts`      |
| TC-S6  | Nothing due            | Open study mode                          | Empty state offering “review ahead” and “review all”         | `study-session-page.test.tsx` |
| TC-S7  | Cards rated `EASY`     | Start a `DUE` session                    | Queue empty; `AHEAD` session returns the scheduled cards     | `test/study.e2e-spec.ts`      |
| TC-S8  | Card from another deck | Submit a review for it                   | `404` (card not in the session deck)                         | `test/study.e2e-spec.ts`      |
| TC-S9  | Completed session      | Read the queue again                     | `409` (session no longer active)                             | `test/study.e2e-spec.ts`      |
| TC-S10 | Active session exists  | Start the same deck and mode again       | The active session is resumed (same id)                      | `test/study.e2e-spec.ts`      |
| TC-S11 | Active session         | Abandon it                               | `ABANDONED`; reviews and completion answer `409`             | `test/study.e2e-spec.ts`      |
| TC-S12 | Review with client id  | Replay the same review                   | Applied once; counters and due date unchanged                | `test/study.e2e-spec.ts`      |

## 5. Analytics (`TC-N`)

| ID    | Preconditions                 | Steps                          | Expected                                                     | Automated in                    |
| ----- | ----------------------------- | ------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| TC-N1 | Reviews on consecutive days   | Read `GET /analytics/overview` | Streak counts consecutive local days (unit-tested rule)      | `study-metrics.service.spec.ts` |
| TC-N2 | A day without reviews         | Read `GET /analytics/overview` | Streak resets to zero after a full gap                       | `study-metrics.service.spec.ts` |
| TC-N3 | Session with `GOOD` + `AGAIN` | Read `GET /analytics/overview` | `retention30d = 0.5`, `reviewsToday = 2`                     | `test/analytics.e2e-spec.ts`    |
| TC-N4 | Scheduled cards               | Read `GET /analytics/forecast` | Seven zero-filled days; today aggregates overdue + due cards | `test/analytics.e2e-spec.ts`    |
| TC-N5 | Fresh account                 | Read both analytics endpoints  | All metrics zero; forecast with seven empty days             | `test/analytics.e2e-spec.ts`    |

## 6. Import and export (`TC-I`)

| ID    | Preconditions            | Steps                                  | Expected                                                | Automated in                    |
| ----- | ------------------------ | -------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| TC-I1 | Deck owned by A          | Import a valid CSV (quotes, tags)      | `imported` equals the valid row count, cards created    | `imports.e2e-spec.ts`           |
| TC-I2 | CSV with BOM + CRLF      | Import                                 | Parsed correctly, no header artefacts                   | `import-cards.use-case.spec.ts` |
| TC-I3 | CSV with a malformed row | Import                                 | Row skipped with its line number; valid rows imported   | `imports.e2e-spec.ts`           |
| TC-I4 | CSV > 1 MB               | Upload                                 | `413`                                                   | `imports.e2e-spec.ts`           |
| TC-I5 | CSV without `back`       | Import                                 | `422` explaining the missing column                     | `imports.e2e-spec.ts`           |
| TC-I6 | Deck with cards          | Export and re-import into another deck | Round trip without data loss; `Content-Disposition` set | `imports.e2e-spec.ts`           |
| TC-I7 | Deck owned by A          | B imports/exports A's deck             | `404` for both operations                               | `imports.e2e-spec.ts`           |
| TC-I8 | CSV with repeated rows   | Import                                 | Duplicates imported and flagged with their row numbers  | `import-cards.use-case.spec.ts` |
| TC-I9 | Header-only CSV          | Import                                 | `0` imported with a notice, no error                    | `import-cards.use-case.spec.ts` |

## 7. Catalogue and AI (`TC-P`)

| ID    | Preconditions       | Steps                                | Expected                                    | Automated in                    |
| ----- | ------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------- |
| TC-P1 | Public deck exists  | Browse `GET /decks/public`           | Catalogue lists the deck with its author    | `test/public-decks.e2e-spec.ts` |
| TC-P2 | Public deck exists  | Clone it into the student's account  | Private copy with cards and attribution     | `test/public-decks.e2e-spec.ts` |
| TC-P3 | Provider configured | Generate card suggestions from notes | Draft cards parsed and trimmed              | `openai-card-generator.spec.ts` |
| TC-P4 | Provider disabled   | Generate card suggestions            | `503` with problem details; input validated | `test/ai.e2e-spec.ts`           |

## 8. Cross-cutting (`TC-X`)

| ID    | Area          | Case                                                     | Expected                                         | Automated in                |
| ----- | ------------- | -------------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| TC-X1 | Accessibility | axe scan on `/`, `/login`, `/register`                   | No serious or critical WCAG 2.1 A/AA violations  | `e2e/a11y.spec.ts`          |
| TC-X2 | Accessibility | axe scan on dashboard, deck, analytics and a dialog      | No serious or critical violations                | `e2e/a11y.spec.ts`          |
| TC-X3 | UX            | Full journey: register → deck → card → study → analytics | Every screen reachable and consistent            | `e2e/study-journey.spec.ts` |
| TC-X4 | Session       | Access a protected route while anonymous                 | Redirect to `/login` preserving the target       | `e2e/smoke.spec.ts`         |
| TC-X5 | API client    | Access token expired while calling the API               | Silent refresh, one retry, request succeeds      | `api-client.test.ts`        |
| TC-X6 | Operations    | `GET /health`                                            | `200` with service name, version and uptime      | `test/app.e2e-spec.ts`      |
| TC-X7 | Operations    | Send a request with `x-request-id`                       | The header is echoed for correlation             | `test/app.e2e-spec.ts`      |
| TC-X8 | Offline       | Grade while offline, then reconnect                      | Review queued with a client id and replayed once | `offline-queue.test.ts`     |
