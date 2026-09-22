# Glossary — DeckUp

| Field       | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| **Version** | 1.0                                                                   |
| **Date**    | 2026-09-22                                                            |
| **Scope**   | Domain vocabulary used across requirements, architecture, code and UI |

Terms are listed alphabetically. The **Canonical name** column is the identifier used in
code and API contracts.

| Term               | Canonical name     | Definition                                                                                                 |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Active recall      | —                  | Learning technique where the student retrieves an answer from memory instead of re-reading it.             |
| Card               | `Card`             | The atomic study unit: a question on the front face and its answer on the back face.                       |
| Card face          | `front` / `back`   | One of the two sides of a card. Both are mandatory and non-empty.                                          |
| Daily queue        | `StudyQueue`       | Ordered list of cards that are due for review in the current study session (oldest due date first).        |
| Deck               | `Deck`             | A named collection of cards owned by one student, typically matching one exam syllabus or subject.         |
| Deck visibility    | `DeckVisibility`   | Access level of a deck: `PRIVATE`, `UNLISTED` or `PUBLIC`.                                                 |
| Difficulty (card)  | `difficulty`       | Optional self-declared complexity of a card (`EASY`, `MEDIUM`, `HARD`) used for authoring, not scheduling. |
| Due date           | `dueAt`            | Instant when a card becomes eligible for review, computed by FSRS and stored in UTC.                       |
| Forecast           | `Forecast`         | Projection of how many cards will become due on each of the next 7 local days.                             |
| FSRS               | `ts-fsrs`          | Free Spaced Repetition Scheduler; the open algorithm (v6) used to schedule reviews.                        |
| Hint               | `hint`             | Optional text shown during study to nudge recall without revealing the answer.                             |
| Import             | `CsvImport`        | Bulk creation of cards from a CSV file with per-row validation and an import summary.                      |
| Lapse              | `lapses`           | Number of times a card was forgotten (rated `AGAIN`) after having graduated from learning.                 |
| Learning step      | `learning_steps`   | Short intervals (minutes) a new card goes through before entering long-term review.                        |
| Owner              | `ownerId`          | The student who owns a deck or card; determines access and privacy.                                        |
| Rating             | `ReviewRating`     | Self-assessed recall quality: `AGAIN`, `HARD`, `GOOD` or `EASY` (FSRS grades 1–4).                         |
| Relearning step    | `relearning_steps` | Short interval applied when a review card is rated `AGAIN`.                                                |
| Retention          | `retention`        | Share of first reviews in a window that were successful (`GOOD` or `EASY`).                                |
| Review             | `ReviewLog`        | A single graded interaction with a card, stored immutably with its timestamp and resulting schedule.       |
| Review state       | `ReviewState`      | Current FSRS scheduling state of a card for a student: stability, difficulty, reps, lapses, `dueAt`.       |
| Spaced repetition  | —                  | Study method that schedules reviews at increasing intervals timed just before forgetting.                  |
| SRS                | —                  | Spaced Repetition System; the software implementing spaced repetition.                                     |
| Stability          | `stability`        | FSRS estimate (in days) of how long the student will remember a card.                                      |
| Streak             | `streak`           | Number of consecutive local calendar days with at least one review.                                        |
| Study session      | `StudySession`     | A bounded review sitting over one deck: starts, grades cards, ends with a summary.                         |
| Subject            | `subject`          | Free-text classification of a deck (e.g. _Mathematics_, _History_) used for filtering.                     |
| Tag                | `Tag`              | Reusable label that can be attached to decks and cards for organization and filtering.                     |
| Timezone (student) | `timezone`         | IANA timezone of the student, used to compute local days for queues, streaks and forecasts.                |
| UUID               | `uuid`             | 128-bit identifier used as primary key for all entities.                                                   |

## Naming rules

- Code, database columns, API fields and UI copy use the **canonical names** in English.
- Ratings, visibility and difficulty use `UPPER_SNAKE_CASE` enum values.
- Instants are stored in UTC (`*_at`, `dueAt`); local-day computations apply the student timezone.

## SWEBOK V4.0a references

- Cap. 1, §4.1 — _Requirements elicitation_: shared vocabulary reduces ambiguity.
- Cap. 1, §4.5 — _Well-formed requirements_: unambiguous terminology.
