# Architecture Overview — DeckUp

| Field       | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                     |
| **Date**    | 2026-09-22                                                                              |
| **Status**  | Approved                                                                                |
| **Method**  | C4 model (context, container, component) · SWEBOK V4.0a, KA02                           |
| **Related** | [`adr/`](./adr) · [`data-model.md`](./data-model.md) · [`openapi.yaml`](./openapi.yaml) |

---

## 1. System context (C4 — Level 1)

DeckUp is a web platform where high school students author flashcard decks and review
them through a spaced-repetition engine.

```mermaid
C4Context
    title System context — DeckUp

    Person(student, "Student", "Busy high school student preparing final exams")
    System(deckup, "DeckUp", "Flashcard authoring, FSRS scheduling and study analytics")
    System_Ext(cloudinary, "Cloudinary", "Image storage and optimized delivery for card images")
    System_Ext(llm, "LLM provider", "Optional AI card generation from study notes (Phase 8)")

    Rel(student, deckup, "Creates decks, studies and reviews progress", "HTTPS")
    Rel(deckup, cloudinary, "Uploads and serves card images", "HTTPS API")
    Rel(deckup, llm, "Requests card suggestions", "HTTPS API (optional)")
```

| Element          | Responsibility                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| **Student**      | The single human actor. Owns decks, studies, and consumes analytics.         |
| **DeckUp**       | The system under design: accounts, decks, cards, scheduling, analytics.      |
| **Cloudinary**   | External managed service for card images (upload, transformation, delivery). |
| **LLM provider** | External AI provider used only by the optional card-generation feature.      |

## 2. Containers (C4 — Level 2)

```mermaid
C4Container
    title Container view — DeckUp

    Person(student, "Student", "High school student")

    System_Boundary(deckup, "DeckUp") {
        Container(web, "Web application", "React 19 · Vite 8 · Tailwind CSS 4", "Serves the SPA: deck management, study mode, analytics")
        Container(api, "API application", "NestJS 12 · Fastify · Clean Architecture", "REST /api/v1: auth, decks, cards, scheduling, analytics")
        ContainerDb(db, "Database", "PostgreSQL 17", "Users, decks, cards, review state, review logs, sessions")
    }

    System_Ext(cloudinary, "Cloudinary", "Card image storage")
    System_Ext(llm, "LLM provider", "Optional card generation")

    Rel(student, web, "Uses", "HTTPS")
    Rel(web, api, "Calls REST API", "JSON over HTTPS")
    Rel(api, db, "Reads/writes via Prisma", "TCP 5432, TLS in production")
    Rel(api, cloudinary, "Uploads images", "HTTPS API")
    Rel(api, llm, "Requests suggestions", "HTTPS API")
```

| Container           | Technology                       | Responsibility                                                         |
| ------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| **Web application** | React 19, Vite 8, TanStack Query | Presentation, client state, server-state cache, routing, a11y.         |
| **API application** | NestJS 12 + Fastify, Prisma 7    | Business rules, FSRS scheduling, validation, persistence, analytics.   |
| **Database**        | PostgreSQL 17                    | Durable storage; source of truth for scheduling state and review logs. |

The web container never talks to the database or to Cloudinary directly: all access goes
through the API, which owns the contracts.

## 3. API components (C4 — Level 3)

The API follows **Clean Architecture**; dependencies always point inwards.

```mermaid
flowchart TB
    subgraph presentation["Presentation layer"]
        C1[Controllers<br/>auth · decks · cards · study · analytics]
        C2[DTOs & Zod pipes<br/>request/response schemas]
        C3[Guards & interceptors<br/>JWT auth · rate limit · logging]
    end

    subgraph application["Application layer"]
        U1[Use cases<br/>one class per use case]
        U2[Ports<br/>repository & service interfaces]
    end

    subgraph domain["Domain layer"]
        D1[Entities<br/>User · Deck · Card · ReviewState]
        D2[Value objects<br/>Rating · Visibility · Difficulty]
        D3[Domain services<br/>SchedulingService · StreakCalculator · RetentionCalculator]
    end

    subgraph infrastructure["Infrastructure layer"]
        I1[Prisma repositories]
        I2[FSRS adapter<br/>ts-fsrs]
        I3[Cloudinary adapter]
        I4[LLM adapter<br/>Phase 8]
    end

    presentation --> application
    application --> domain
    infrastructure -. implements .-> application
    infrastructure -. implements .-> domain
```

| Layer              | Contains                                                            | May import                   |
| ------------------ | ------------------------------------------------------------------- | ---------------------------- |
| **Presentation**   | Controllers, DTOs, pipes, guards, interceptors                      | Application                  |
| **Application**    | Use cases (one per action), ports, orchestration                    | Domain                       |
| **Domain**         | Entities, value objects, domain services (FSRS, streaks, retention) | Nothing (pure TypeScript)    |
| **Infrastructure** | Prisma repositories, `ts-fsrs`, Cloudinary and LLM adapters         | Domain + application (ports) |

Key rule: scheduling mathematics (FSRS) and analytics rules live in the **domain** and are
tested without a database, an HTTP server or the `ts-fsrs` library (through a port).

## 4. Web application structure

```
apps/web/src/
├── app/            # routing, providers, layout
├── features/       # feature-first modules
│   ├── auth/       # sign in / register
│   ├── decks/      # deck list, deck detail, card editor
│   ├── study/      # study session (queue, flip, ratings, summary)
│   ├── analytics/  # streak, retention, forecast charts
│   └── settings/   # profile, timezone, preferences
├── components/     # shared UI primitives (shadcn/ui based)
├── lib/            # api client, query keys, utilities
└── test/           # setup and test utilities
```

- Server state exclusively through **TanStack Query**; no `fetch` inside components.
- Feature folders are self-contained: routes, hooks, components and tests live together.

## 5. Deployment view

```mermaid
flowchart LR
    subgraph internet["Internet"]
        U[Student browser]
    end

    subgraph vercel["Vercel"]
        W[Web SPA<br/>static assets + CDN]
    end

    subgraph railway["Railway"]
        A[API container<br/>NestJS + Fastify]
    end

    subgraph neon["Neon"]
        DB[(PostgreSQL 17<br/>serverless)]
    end

    CDN[Cloudinary CDN]

    U -->|HTTPS| W
    U -->|HTTPS /api/v1| A
    W -.->|fetch API| A
    A -->|Prisma + pg driver| DB
    A -->|upload| CDN
    U -->|image delivery| CDN
```

| Environment    | Web             | API                    | Database             |
| -------------- | --------------- | ---------------------- | -------------------- |
| **Local**      | Vite dev server | NestJS watch mode      | Docker Compose PG 17 |
| **Production** | Vercel (CDN)    | Railway (Docker image) | Neon (PostgreSQL 17) |

CI/CD: GitHub Actions runs the five quality gates on every push/PR and deploys `main`
(see [`../04-operations/deployment.md`](../04-operations/deployment.md), Phase 7).

## 6. Cross-cutting concerns

| Concern           | Approach                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Security**      | Argon2id passwords, JWT access + rotating refresh cookies, rate limiting, Zod validation at the edge, CORS allow-list (ADR-0006). |
| **Contracts**     | Zod schemas in `@deckup/shared`; OpenAPI document as the published REST contract.                                                 |
| **Errors**        | Typed domain errors mapped to RFC 7807-style problem responses by an exception filter.                                            |
| **Observability** | Structured Fastify logs with request IDs (`x-request-id` echoed); `/health` endpoint.                                             |
| **Testing**       | Domain unit tests (Vitest), API integration with real PostgreSQL, web E2E with Playwright.                                        |
| **Accessibility** | WCAG 2.1 AA, keyboard-first study mode.                                                                                           |
| **Time**          | All instants stored in UTC; local-day logic applies the student's IANA timezone.                                                  |

## 7. Decision index

| ADR                                             | Decision                                    |
| ----------------------------------------------- | ------------------------------------------- |
| [ADR-0001](./adr/ADR-0001-monorepo-strategy.md) | Monorepo with pnpm workspaces + Turborepo   |
| [ADR-0002](./adr/ADR-0002-backend-framework.md) | NestJS 12 + Fastify with Clean Architecture |
| [ADR-0003](./adr/ADR-0003-database-and-orm.md)  | PostgreSQL 17 + Prisma 7 with pg driver     |
| [ADR-0004](./adr/ADR-0004-shared-contracts.md)  | Zod contracts in `@deckup/shared`           |
| [ADR-0005](./adr/ADR-0005-spaced-repetition.md) | FSRS via `ts-fsrs` behind a domain port     |
| [ADR-0006](./adr/ADR-0006-authentication.md)    | JWT access + refresh rotation with Argon2id |
| [ADR-0007](./adr/ADR-0007-deployment.md)        | Vercel + Railway + Neon                     |
| [ADR-0008](./adr/ADR-0008-testing-strategy.md)  | Vitest, Supertest and Playwright            |

## 8. SWEBOK V4.0a references

- Cap. 2, §2.1 — _Software architecture fundamentals_: structures and views.
- Cap. 2, §2.4 — _Architecture as significant decisions_ (see ADRs).
- Cap. 2, §3.2 — _Architecture synthesis_: decomposition, layering, dependency rules.
- Cap. 3, §4.2 — _Design patterns_: ports and adapters, repository, dependency injection.
