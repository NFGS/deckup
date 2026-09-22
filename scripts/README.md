# scripts

Automation scripts for the DeckUp monorepo.

| Script           | Purpose                                                                                                           | Command                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `notion-sync.ts` | Publishes the requirements, architecture, testing and operations docs as child pages of the DeckUp page in Notion | `NOTION_TOKEN=… NOTION_PAGE_ID=… pnpm sync:notion` |

## Notion sync

- Root page: **DeckUp** inside _Ningendo Bee Projects_ — ID
  `3e3aee9c-1744-8107-aeeb-ea3c3a6db64b` (see SPEC.md §7).
- Create an internal integration token with _insert content_ permission on that
  page and expose it as `NOTION_TOKEN`.
- The script converts markdown to Notion blocks (headings, paragraphs, lists,
  quotes, code fences and tables) and chunks the payload at 100 blocks per
  request.
- **Idempotent**: before publishing, child pages with the same title are
  archived, so re-runs refresh the documentation instead of duplicating it.
- Last sync: 2026-09-22 — 10 documents (931 blocks at the latest dry run).
- `--dry-run` prints the block counts without calling the API:

  ```bash
  pnpm sync:notion --dry-run
  ```
