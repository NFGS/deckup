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
- The script converts markdown to rich Notion blocks: headings, paragraphs,
  numbered and bulleted lists, to-dos, quotes, dividers, GitHub-style callouts
  (`> [!NOTE]`), code fences (Mermaid included), native tables, inline
  formatting (bold, italic, code, strikethrough, links) and images. A table of
  contents is inserted automatically when a document has three or more headings.
- Relative images are uploaded to Cloudinary when `CLOUDINARY_URL` is set
  (signed uploads, folder `deckup/docs`); otherwise they degrade to a caption.
- The payload is chunked at 100 blocks per request without splitting a table
  from its rows.
- **Idempotent**: before publishing, child pages with the same title are
  archived, so re-runs refresh the documentation instead of duplicating it.
- Last sync: 2026-10-04 — 12 documents with rich blocks (78 native tables, 5
  Mermaid diagrams, 15 callouts, 12 evidence images).
- `--dry-run` prints the block counts without calling the API:

  ```bash
  pnpm sync:notion --dry-run
  ```

## Capture helpers

Static PNG captures of HTML artifacts (used for the Notion documentation):

| Script                           | Purpose                                                                                              | Command                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `.archify/export-png.mjs`        | Captures the four Archify diagrams (context, containers, deployment, FSRS lifecycle) with Playwright | `node .archify/export-png.mjs`        |
| `.open-design/capture-cover.mjs` | Captures the Open Design cover (`supabase` design system, `motion-frames` template)                  | `node .open-design/capture-cover.mjs` |

Both write their output to `/tmp/opencode/archify-png/`; the Cloudinary upload
helper reads from that directory with the signed-upload recipe in
`notion-sync.ts`.
