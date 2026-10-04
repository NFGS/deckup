# scripts

Automation scripts for the DeckUp monorepo.

| Script             | Purpose                                                                                                           | Command                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `notion-sync.ts`   | Publishes the requirements, architecture, testing and operations docs as child pages of the DeckUp page in Notion | `NOTION_TOKEN=… NOTION_PAGE_ID=… pnpm sync:notion` |
| `obsidian-sync.ts` | Publishes the documents and ADRs as notes in the Obsidian vault (Ningendo Bee) with YAML frontmatter              | `pnpm sync:obsidian`                               |

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
- Last sync: 2026-10-04 — 13 documents with rich blocks (83 native tables, 2
  Mermaid diagrams, 16 callouts, 16 images: 12 evidence screenshots + 4 Archify
  diagrams).
- `--dry-run` prints the block counts without calling the API:

  ```bash
  pnpm sync:notion --dry-run
  ```

- `--only <substring>` re-publishes just the documents whose title contains the
  substring (useful to refresh a single page without recreating the others):

  ```bash
  pnpm sync:notion --only "Project Status"
  ```

## Obsidian sync

- Vault: **Ningendo Bee** — `~/Documents/Obsidian Vaults/Ningendo Bee`
  (override with `OBSIDIAN_VAULT_PATH`).
- Writes the 13 documents to `DeckUp/Documentación` and the 8 MADR ADRs to
  `DeckUp/Decisiones Técnicas` with YAML frontmatter (`proyecto`, `fuente`,
  `synced`, `tags`); copies the evidence screenshots to
  `DeckUp/Recursos/evidencias` and turns them into wiki-embeds. Relative
  repository links degrade to plain text; Mermaid, tables and callouts render
  natively in Obsidian.
- The curated map of content (`DeckUp/README.md`) and the vault `Home.md` are
  maintained manually and are never overwritten by the sync.
- `--dry-run` lists the notes without writing:

  ```bash
  pnpm sync:obsidian --dry-run
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
