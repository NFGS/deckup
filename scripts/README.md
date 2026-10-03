# scripts

Automation scripts for the DeckUp monorepo.

| Script           | Purpose                                                                                                           | Command                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `notion-sync.ts` | Publishes the requirements, architecture, testing and operations docs as child pages of the DeckUp page in Notion | `NOTION_TOKEN=… NOTION_PAGE_ID=… pnpm sync:notion` |

## Notion sync

- Root page: **DeckUp** — ID `3ee7d55f-d95e-8079-8ee8-f9dc00042699`
  (<https://app.notion.com/p/3ee7d55fd95e80798ee8f9dc00042699>, see SPEC.md §7).
- Create an internal integration token with _insert content_ permission on that
  page and expose it as `NOTION_TOKEN`.
- The script converts markdown to Notion blocks (headings, paragraphs, lists,
  quotes, code fences and tables) and chunks the payload at 100 blocks per
  request.
- **Idempotent**: before publishing, child pages with the same title are
  archived, so re-runs refresh the documentation instead of duplicating it.
- Last sync: 2026-10-03 — 12 documents (10 technical docs plus the SENA general
  system report and the project status).
- `--dry-run` prints the block counts without calling the API:

  ```bash
  pnpm sync:notion --dry-run
  ```
