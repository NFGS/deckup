# scripts

Automation scripts for the DeckUp monorepo.

## Synchronization model

The repository documentation (`docs/`) is the single source of truth. It is
propagated to three mirrors, and every write is recorded in
`.sync-manifest.json` (a content hash per document and per target) so the sync
is **incremental** (only what changed), **idempotent** and **verifiable**.

| Environment    | Role            | Updated by                                                  |
| -------------- | --------------- | ----------------------------------------------------------- |
| Repository     | source of truth | you / the editor                                            |
| GitHub         | transport + CI  | `git push`                                                  |
| Notion         | outbound mirror | `pnpm sync:notion` (CI on push, or locally)                 |
| Obsidian vault | outbound mirror | `pnpm sync:obsidian` (local only — the vault lives on disk) |

Triggers that keep the four in step:

- **Local edit** → `pnpm sync:watch` (debounced `fs.watch` on `docs/`) or the
  `post-commit` hook (`DECKUP_AUTO_SYNC=1` auto-syncs, otherwise it reminds).
- **Pull/merge** → the `post-merge` hook re-syncs when the merge touched `docs/`.
- **Push / CI** → `.github/workflows/docs-sync.yml` re-publishes Notion and
  commits the refreshed manifest (with `[skip ci]`).
- **Pre-push** → the `pre-push` hook runs `pnpm sync:check` and warns on drift
  (blocks the push only when `DECKUP_SYNC_STRICT=1`).

Detecting a change in _any_ of the four environments:

| Where it changed | How it is detected                                    | Reconciled by                       |
| ---------------- | ----------------------------------------------------- | ----------------------------------- |
| Repository       | `sourceHash` differs from the manifest                | `pnpm sync:all`                     |
| GitHub           | same signal after the pull/merge                      | `post-merge` hook / `pnpm sync:all` |
| Obsidian         | note bytes differ from the recorded hash              | `pnpm sync:obsidian`                |
| Notion           | top-level block count differs from the recorded count | `pnpm sync:notion --only <title>`   |

Notion is treated as a **read-only mirror**: hand edits are reported by
`pnpm sync:check --remote` and reconciled by re-publishing from the repository
(the repository always wins). A text-only Notion edit that keeps the block count
is caught the next time the document changes in the repository.

## Commands

| Command                    | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `pnpm sync:all`            | Propagate to Notion + Obsidian and update the manifest |
| `pnpm sync:notion`         | Notion only                                            |
| `pnpm sync:obsidian`       | Obsidian vault only                                    |
| `pnpm sync:check`          | Offline drift report (repository + Obsidian)           |
| `pnpm sync:check --remote` | Also count Notion blocks and flag hand edits           |
| `pnpm sync:watch`          | Watch `docs/` and re-sync on every save                |

Flags: `--dry-run` (preview), `--only <substring>` (a single document),
`--force` (re-publish even when unchanged).

## Manifest

`.sync-manifest.json` is committed so CI can verify the mirror state:

```json
"docs/01-requirements/glossary.md": {
  "sourceHash": "sha256-…",
  "syncedAt": "2026-10-04T16:26:11.563Z",
  "targets": {
    "obsidian": { "path": "DeckUp/Documentación/Glossary.md", "hash": "sha256-…" },
    "notion": { "id": "…", "lastEditedTime": "…", "blockCount": 11 }
  }
}
```

`scripts/lib/documents.ts` is the canonical registry (13 documents + the MADR
ADRs discovered on disk); both mirrors consume it, so they can never disagree on
_which_ documents they publish.

## Notion sync

- Root page: **DeckUp** — ID `3ee7d55f-d95e-8079-8ee8-f9dc00042699`
  (<https://app.notion.com/p/3ee7d55fd95e80798ee8f9dc00042699>, see SPEC.md §7).
- Create an internal integration token with _insert content_ permission on that
  page and expose it as `NOTION_TOKEN`; the page ID goes in `NOTION_PAGE_ID`.
- The script converts markdown to rich Notion blocks: headings, paragraphs,
  numbered and bulleted lists, to-dos, quotes, dividers, GitHub-style callouts
  (`> [!NOTE]`), code fences (Mermaid included), native tables, inline
  formatting (bold, italic, code, strikethrough, links) and images. A table of
  contents is inserted automatically when a document has three or more headings.
- Relative images are uploaded to Cloudinary when `CLOUDINARY_URL` is set
  (signed uploads, folder `deckup/docs`); otherwise they degrade to a caption.
- The payload is chunked at 100 blocks per request without splitting a table
  from its rows.
- Documents with an unchanged `sourceHash` and a recorded `blockCount` are
  skipped; pass `--force` to re-publish them.
- Last sync: 2026-10-04 — **21 pages** (13 documents + 8 ADRs).

## Obsidian sync

- Vault: **Ningendo Bee** — `~/Documents/Obsidian Vaults/Ningendo Bee`
  (override with `OBSIDIAN_VAULT_PATH`).
- Writes the 13 documents to `DeckUp/Documentación` and the 8 MADR ADRs to
  `DeckUp/Decisiones Técnicas` with YAML frontmatter (`proyecto`, `fuente`,
  `synced`, `tags`); copies the evidence screenshots to
  `DeckUp/Recursos/evidencias` and turns them into wiki-embeds. Relative
  repository links degrade to plain text; Mermaid, tables and callouts render
  natively in Obsidian.
- A note is re-written only when the source changed or the file on disk was
  edited by hand (both are compared by hash).
- The curated map of content (`DeckUp/README.md`) and the vault `Home.md` are
  maintained manually and are never overwritten by the sync.

## Capture helpers

Static PNG captures of HTML artifacts (used for the Notion documentation):

| Script                           | Purpose                                                                                              | Command                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `.archify/export-png.mjs`        | Captures the four Archify diagrams (context, containers, deployment, FSRS lifecycle) with Playwright | `node .archify/export-png.mjs`        |
| `.open-design/capture-cover.mjs` | Captures the Open Design cover (`supabase` design system, `motion-frames` template)                  | `node .open-design/capture-cover.mjs` |

Both write their output to `/tmp/opencode/archify-png/`; the Cloudinary upload
helper reads from that directory with the signed-upload recipe in
`notion-sync.ts`.
