# User Story Refinement — Epic 03: Education

| Field       | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                     |
| **Date**    | 2026-09-22                                                                              |
| **Author**  | Fabián Gallego (product owner / architect)                                              |
| **Status**  | Approved for implementation                                                             |
| **Source**  | `REQUIREMENTS.pdf` — Epic 03 deck (status: _needs refinement_)                          |
| **Method**  | SWEBOK V4.0a, KA01 §4.2–4.5 (specification) and §7.2–7.3 (prioritization, traceability) |
| **Related** | [`traceability-matrix.md`](./traceability-matrix.md) · [`glossary.md`](./glossary.md)   |

---

## 1. Epic statement

> **User as a busy high school student, I want to create customized digital flashcard decks, so that I can study more efficiently for my final exams.**

The source deck marks this story as **NEEDS REFINEMENT**: it is a single sentence with no
acceptance criteria, no scope boundaries, no non-functional constraints and no traceability.
This document refines it into four user stories of **progressively increasing detail**:
`US-01` is intentionally general (epic level), while `US-04` is fully specified and
implementation-ready.

## 2. Refinement strategy

Two principles drive the refinement:

1. **Progressive disclosure of detail.** Each story adds specification attributes that the
   previous one lacks. Detail grows along seven axes: role specificity, scope boundaries,
   acceptance criteria, non-functional requirements, edge cases, traceability and estimation.
2. **Connextra + BDD.** Every statement uses the required vocabulary — `User as a` / `As a`,
   `I want to`, `So that` — and every acceptance criterion follows
   `Given / When / Then` (SWEBOK §4.3: _"a comprehensive set of acceptance tests that
   simultaneously serve as living documentation"_).

### 2.1 Progressive detail matrix

| Attribute                             | US-01 (General) | US-02 (Refined) |     US-03 (Detailed)     |         US-04 (Very detailed)         |
| ------------------------------------- | :-------------: | :-------------: | :----------------------: | :-----------------------------------: |
| Role specificity                      | Generic persona | Persona + goal  | Persona + goal + context | Persona + goal + context + constraint |
| Scope boundaries (in/out)             |        —        |       ✅        |            ✅            |                  ✅                   |
| Acceptance criteria (Given/When/Then) |        —        |        2        |            4             |                   7                   |
| Non-functional requirements           |        —        |        —        |            3             |                   5                   |
| Edge cases                            |        —        |        —        |            4             |                   6                   |
| Business rules                        |        —        |        —        |            1             |                   5                   |
| Dependencies declared                 |        —        |       ✅        |            ✅            |                  ✅                   |
| Traceability (RF / CU / TC)           |     RF only     |       ✅        |            ✅            |                  ✅                   |
| Estimation (story points)             |        1        |        3        |            5             |                  13                   |
| Definition of Ready / Done            |        —        |        —        |           DoR            |               DoR + DoD               |

### 2.2 Story map

| ID        | Level         | Title                                    | Priority (MoSCoW) | Estimate |
| --------- | ------------- | ---------------------------------------- | ----------------- | -------- |
| **US-01** | General       | Create custom flashcard decks            | Must              | 1 SP     |
| **US-02** | Refined       | Organize decks and author basic cards    | Must              | 3 SP     |
| **US-03** | Detailed      | Enrich cards and import material in bulk | Should            | 5 SP     |
| **US-04** | Very detailed | Study with FSRS scheduling and analytics | Must              | 13 SP    |

---

## 3. US-01 — Create custom flashcard decks (General)

**Story**

> **User as a busy high school student**
> **As a** busy high school student, **I want to** create customized digital flashcard decks,
> **so that** I can study more efficiently for my final exams.

**Rationale.** Passive re-reading is ineffective; active recall over self-authored material
is what improves exam performance. The epic therefore starts with deck creation as the
foundational capability of the product.

**Priority.** Must · **Estimate.** 1 SP · **Dependencies.** None (requires an authenticated
student — see RF-01, the enabling requirement).

**Scope**

- _In:_ create a deck, give it a title, and see it in the student's deck list.
- _Out:_ card content, sharing, scheduling, analytics (covered by later stories).

**High-level done signal.** A deck created by a student is persisted and still visible after
signing out and back in.

**Traceability.** RF-02 · CU#03 · TC-01, TC-02

---

## 4. US-02 — Organize decks and author basic cards (Refined)

**Story**

> **User as a busy high school student**
> **As a** busy high school student, **I want to** organize my decks by subject with a title,
> description and tags, and add front/back cards, **so that** my study material matches each
> exam syllabus.

**Rationale.** A single flat list of decks does not survive a real exam season. Students
think in subjects (Mathematics, History, Biology), so decks must be classifiable and must
hold actual study content.

**Priority.** Must · **Estimate.** 3 SP · **Dependencies.** US-01, RF-01.

**Scope**

- _In:_ deck metadata (title, subject, description, tags), card authoring (front/back text,
  edit, delete), filtering the deck list by subject.
- _Out:_ rich card content (images, hints, difficulty), bulk import, study scheduling.

**Acceptance criteria**

- **AC-02.1 — Add a card**
  _Given_ a signed-in student viewing an existing deck,
  _when_ they add a card with non-empty front and back text,
  _then_ the card is saved and listed inside that deck.
- **AC-02.2 — Organize and filter by subject**
  _Given_ a student with several decks,
  _when_ they assign a subject and tags to a deck,
  _then_ the deck can be filtered by subject in the deck list.

**Traceability.** RF-03, RF-04 · CU#04, CU#05 · TC-03 … TC-06

---

## 5. US-03 — Enrich cards and import material in bulk (Detailed)

**Story**

> **User as a busy high school student**
> **As a** busy high school student, **I want to** enrich cards with images, hints, difficulty
> levels and tags, and import cards in bulk from a CSV file, **so that** I can build complete
> decks quickly without repetitive typing.

**Rationale.** High school material is visual (diagrams, maps, formulas) and already exists in
digital form. Typing hundreds of cards one by one is the main reason students abandon
flashcard tools; enrichment and bulk import remove that friction.

**Priority.** Should · **Estimate.** 5 SP · **Dependencies.** US-02, RF-01.

**Scope**

- _In:_ one optional image per card face, a hint, a difficulty level, tags; CSV import with
  per-row validation and an import summary.
- _Out:_ AI generation of cards, collaborative editing, automatic OCR of scanned notes.

**Acceptance criteria**

- **AC-03.1 — Attach an image to a card**
  _Given_ a student editing a card,
  _when_ they attach a JPEG or PNG image of at most 5 MB,
  _then_ the image is stored and displayed on the corresponding card face.
- **AC-03.2 — Add a hint and difficulty level**
  _Given_ a student editing a card,
  _when_ they set a hint and a difficulty level (easy / medium / hard),
  _then_ both values are persisted and the hint is available during study.
- **AC-03.3 — Import a valid CSV**
  _Given_ a student with a CSV file containing `front,back` columns and at most 1 000 rows,
  _when_ they import it into a deck,
  _then_ every valid row becomes a card and a summary reports how many rows were imported.
- **AC-03.4 — Import with invalid rows**
  _Given_ a CSV file where some rows are malformed (missing columns, empty front),
  _when_ the student imports it,
  _then_ valid rows are imported, invalid rows are skipped and reported with row numbers,
  and the deck is never left in a partially corrupted state.

**Non-functional requirements**

- **NFR-03.1** — Reject uploads above 5 MB or with a content type other than JPEG/PNG, with a
  clear error message.
- **NFR-03.2** — Importing 1 000 rows completes in under 5 seconds (p95) and is transactional:
  either all valid rows are committed or none are.
- **NFR-03.3** — Card images are private to their owner; delivery uses signed/optimized URLs.

**Edge cases**

| #   | Case                                           | Expected behavior                                   |
| --- | ---------------------------------------------- | --------------------------------------------------- |
| E1  | CSV with duplicated rows                       | Duplicates are imported and flagged in the summary  |
| E2  | CSV with only a header row                     | Import succeeds with 0 imported rows and a notice   |
| E3  | CSV encoded in UTF-8 with BOM or CRLF endings  | Parser normalizes encoding and line endings         |
| E4  | Image removed from a card that already had one | Card keeps text content; image reference is cleared |

**Business rule.** BR-03.1 — A card must always have non-empty front and back text; images,
hints and tags are optional.

**Traceability.** RF-05, RF-06 · CU#06 (includes CU-I), CU#07 (includes CU-V) · TC-07 … TC-14

---

## 6. US-04 — Study with FSRS scheduling and analytics (Very detailed)

**Story**

> **User as a busy high school student preparing for final exams**
> **As a** busy high school student preparing for final exams, **I want to** review my cards
> through a spaced-repetition engine that shows each card right before I forget it, tracks my
> retention and streaks, and forecasts my daily workload, **so that** I maximize my exam
> performance with the minimum study time.

**Rationale.** Flashcards only work if reviews happen at the right moment. A scheduling
algorithm (FSRS) turns a static deck into a study plan; analytics make progress visible and
sustain the habit during the weeks before finals.

**Priority.** Must · **Estimate.** 13 SP · **Dependencies.** US-02 (cards exist), RF-01.

**Scope**

- _In:_ daily queue, four-grade rating (Again / Hard / Good / Easy), FSRS-computed next due
  date, session summary, streak, retention metric, 7-day workload forecast.
- _Out:_ multi-device real-time sync, social features, exam-date-driven plan compression
  (candidate for a later iteration).

**Acceptance criteria**

- **AC-04.1 — Build the daily queue**
  _Given_ a student with cards whose due date is today or earlier,
  _when_ they start a study session for a deck,
  _then_ the queue contains exactly those cards, ordered by due date (oldest first), and the
  remaining count is displayed.
- **AC-04.2 — Rate recall and reschedule**
  _Given_ a card shown during study,
  _when_ the student rates it Again, Hard, Good or Easy,
  _then_ the system computes and persists the next due date with FSRS
  (Again → relearning within the session; Easy → the longest interval).
- **AC-04.3 — Session summary**
  _Given_ a finished session,
  _when_ the student completes the queue,
  _then_ a summary shows cards reviewed, accuracy and elapsed time.
- **AC-04.4 — Streak tracking**
  _Given_ at least one review on each of the previous consecutive days,
  _when_ the student reviews today,
  _then_ the streak increments and is shown on the dashboard.
- **AC-04.5 — Retention metric**
  _Given_ the review history of the last 30 days,
  _when_ the student opens analytics,
  _then_ the retention rate (share of first reviews not rated Again) is displayed.
- **AC-04.6 — Workload forecast**
  _Given_ the current scheduling state of all cards,
  _when_ the student opens the forecast,
  _then_ the expected number of due cards per day for the next 7 days is charted.
- **AC-04.7 — Nothing due**
  _Given_ a student with no cards due today,
  _when_ they open study mode,
  _then_ an empty state offers two options: review ahead of schedule or review all cards.

**Non-functional requirements**

- **NFR-04.1** — Card-to-card transition in study mode below 100 ms (p95) on a mid-range phone.
- **NFR-04.2** — Scheduling updates are atomic: a rating is never lost, even if the app closes
  immediately after grading.
- **NFR-04.3** — Due dates are computed and displayed in the student's configured timezone.
- **NFR-04.4** — Analytics queries respond in under 500 ms (p95) with 10 000 review logs.
- **NFR-04.5** — Study mode is fully operable with the keyboard (`Space` to flip, `1`–`4` to
  rate) and meets WCAG 2.1 AA contrast.

**Edge cases**

| #   | Case                                 | Expected behavior                                                       |
| --- | ------------------------------------ | ----------------------------------------------------------------------- |
| E1  | All cards rated Again                | Cards re-enter the session after the relearning step; summary is honest |
| E2  | Review at 23:59 local time           | The review counts for the local calendar day of the student             |
| E3  | Session interrupted (browser closed) | Already-rated cards keep their new schedule; the queue resumes          |
| E4  | Deck emptied while a session is open | Session ends gracefully with the summary of what was reviewed           |
| E5  | Clock skew between client and server | Server time is authoritative for all scheduling decisions               |
| E6  | First-ever review of a new card      | Card enters the learning steps before graduating to review intervals    |

**Business rules**

- **BR-04.1** — A card is _due_ when its `dueAt` is earlier than or equal to the current server
  time expressed in the student's timezone.
- **BR-04.2** — Ratings map to the FSRS scale: Again = 1, Hard = 2, Good = 3, Easy = 4.
- **BR-04.3** — A streak increments once per local calendar day with at least one review and
  resets when a full local day passes with no reviews.
- **BR-04.4** — Retention counts the first review of each card in the window; Good and Easy are
  successes, Again and Hard are failures.
- **BR-04.5** — The forecast counts cards by `dueAt` date for the next 7 local days and is
  computed server-side.

**Definition of Ready**

- [ ] Cards with scheduling state exist and are reachable through the API.
- [ ] The FSRS parameter set is defined and versioned.
- [ ] Analytics window definitions (30-day retention, 7-day forecast) are agreed.

**Definition of Done**

- [ ] All 7 acceptance criteria verified by automated tests.
- [ ] Domain tests cover every rating transition and the streak/retention rules.
- [ ] p95 performance targets measured and reported.
- [ ] Analytics and study screens pass the accessibility checklist.

**Traceability.** RF-08, RF-09, RF-10 · CU#08 (includes CU-Q and CU-S; extended by CU-R),
CU#09 (includes CU-E) · TC-15 … TC-26

---

## 7. Refinement log

| Iteration | Story | What changed compared with the previous level                                                                       |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| 0         | Epic  | Single sentence, no attributes, flagged _needs refinement_.                                                         |
| 1         | US-01 | Role named, capability and benefit stated; priority and estimate added; scope consciously left open.                |
| 2         | US-02 | Scope bounded, 2 BDD criteria, dependencies and first traceability links added.                                     |
| 3         | US-03 | 4 BDD criteria, 3 NFRs, 4 edge cases, 1 business rule; external integration (image storage) and CSV contract fixed. |
| 4         | US-04 | 7 BDD criteria, 5 NFRs with measurable targets, 6 edge cases, 5 business rules, DoR/DoD, full traceability.         |

## 8. Consolidated non-functional requirements

| ID     | Category       | Requirement                                                          | Source |
| ------ | -------------- | -------------------------------------------------------------------- | ------ |
| NFR-01 | Security       | Passwords hashed with Argon2id; sessions use rotating refresh tokens | US-01+ |
| NFR-02 | Performance    | API p95 latency < 300 ms for CRUD endpoints                          | US-02  |
| NFR-03 | Accessibility  | WCAG 2.1 AA on all student-facing screens                            | US-03+ |
| NFR-04 | Usability      | Study mode operable with keyboard only                               | US-04  |
| NFR-05 | Data integrity | Scheduling writes are atomic; imports are transactional              | US-03+ |
| NFR-06 | Privacy        | Card images private to their owner; no third-party tracking          | US-03  |
| NFR-07 | Observability  | Structured logs with request IDs; `/health` endpoint                 | All    |
| NFR-08 | Portability    | Web app responsive from 360 px to desktop                            | All    |

## 9. Criterios de verificación (document validity)

- [ ] Every story uses `User as a` / `As a`, `I want to` and `So that` exactly as required.
- [ ] Detail strictly increases from US-01 to US-04 across all seven refinement axes.
- [ ] Every acceptance criterion is testable and written in Given/When/Then form.
- [ ] Every story is traceable to at least one functional requirement and one use case.
- [ ] No requirement contradicts another; conflicts are resolved in favour of the later story.

## 10. SWEBOK V4.0a references

- Cap. 1, §4.2 — _User stories_: role–capability–benefit structure.
- Cap. 1, §4.3 — _BDD_: acceptance criteria as living documentation.
- Cap. 1, §4.5 — _Attributes of a well-formed requirement_: ID, rationale, source, priority,
  dependencies, conflicts.
- Cap. 1, §7.2 — _Prioritization_: MoSCoW.
- Cap. 1, §7.3 — _Traceability_: origin → design → tests → code.
