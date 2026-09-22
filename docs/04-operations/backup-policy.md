# Backup Policy — DeckUp

| Field       | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| **Version** | 1.0                                                               |
| **Date**    | 2026-09-22                                                        |
| **Related** | [`runbook.md`](./runbook.md) · [`deployment.md`](./deployment.md) |

---

## 1. Data classification

| Data                              | Criticality | Notes                                      |
| --------------------------------- | ----------- | ------------------------------------------ |
| `users`, `decks`, `cards`, `tags` | High        | Student-authored study material            |
| `review_states`, `review_logs`    | High        | Irreplaceable learning history (analytics) |
| `study_sessions`                  | Medium      | Reproducible from review logs              |
| `refresh_tokens`                  | Low         | Regenerated on sign-in                     |

## 2. Objectives

| Metric                  | Target                                                    |
| ----------------------- | --------------------------------------------------------- |
| **RPO** (max data loss) | 5 minutes — Neon continuous WAL archiving / PITR          |
| **RTO** (max downtime)  | 1 hour — restore a Neon branch and repoint `DATABASE_URL` |
| **Retention**           | 7 days of point-in-time restore (Neon free tier)          |

## 3. Mechanisms

1. **Continuous (primary)** — Neon keeps a write-ahead log with point-in-time
   restore. No action required; verify the restore window in the Neon console.
2. **Logical dumps (secondary)** — before risky operations (destructive
   migration, data fix), export a logical backup:

   ```bash
   pg_dump "$DATABASE_URL" --format=custom --no-owner \
     --file "deckup-$(date +%Y%m%d-%H%M).dump"
   ```

   Store the dump outside the repository (encrypted drive or private object
   storage). Dumps contain personal data: never commit them (`.gitignore`
   already excludes `*.dump` patterns through `*.local`; verify before adding).

3. **Development data** — the local Docker volume
   (`deckup_deckup-db-data`) is disposable. It is recreated with
   `docker compose up -d db && pnpm --filter @deckup/api prisma:migrate`.

## 4. Restore procedure

1. Neon console → _Branches_ → **Restore** → pick the timestamp before the
   incident (or create a branch from that timestamp).
2. Validate the restored branch:
   ```bash
   psql "<restored-branch-url>" -c 'select count(*) from users;'
   psql "<restored-branch-url>" -c 'select max(reviewed_at) from review_logs;'
   ```
3. Repoint `DATABASE_URL` in Railway to the restored branch and redeploy the API.
4. Run the post-deployment verification from
   [`deployment.md`](./deployment.md) §5.

### Restore from a logical dump

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname "$DATABASE_URL" deckup-YYYYMMDD-HHMM.dump
```

## 5. Restore drill (monthly)

1. Create a branch in Neon from a timestamp 24 h old.
2. Run the validation queries from §4.2 against it.
3. Record the drill date and outcome in the project log (Notion/Obsidian).
4. Delete the drill branch.

> A backup that has never been restored is not a backup: the drill is part of
> the monthly checklist.

## 6. Responsibilities

Single-maintainer project: the developer on duty owns backups, the monthly drill
and the incident log. Security incidents follow
[`security.md`](./security.md) §5.
