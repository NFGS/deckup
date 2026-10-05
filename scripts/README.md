# scripts

Automation scripts for the DeckUp monorepo.

## Synchronization model

The repository documentation (`docs/`) is the single source of truth. It is
propagated to three mirrors, and every write is recorded in
`.sync-manifest.json` (a content hash per document and per target) so the sync
is **incremental** (only what changed), **idempotent** and **verifiable**.

The goal is **alignment, not duplication**: the four environments must never
contradict each other, but each one keeps the role and features that justify it.

| Environment    | Role            | What it is for                                                  |
| -------------- | --------------- | --------------------------------------------------------------- |
| Repository     | source of truth | versioned markdown, code, CI, the canonical content             |
| GitHub         | transport + CI  | history, review, automation; runs the Notion mirror on push     |
| Notion         | mirror          | rich reading and sharing (tables, callouts, Mermaid, images)    |
| Obsidian vault | mirror          | local search, graph, wiki-links, offline access, ADR navigation |

A document may deliberately target only one mirror (`targets` in
`scripts/lib/documents.ts`); the manifest tracks each target independently and a
missing target is never reported as drift. Today every document targets both.

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
| Repository       | canonical `sourceHash` differs from the manifest      | `pnpm sync:all`                     |
| GitHub           | same signal after the pull/merge                      | `post-merge` hook / `pnpm sync:all` |
| Obsidian         | note bytes differ from the recorded hash              | `pnpm sync:obsidian`                |
| Notion           | top-level block count differs from the recorded count | `pnpm sync:notion --only <title>`   |

Notion is treated as a **read-only mirror**: hand edits are reported by
`pnpm sync:check --remote` and reconciled by re-publishing from the repository
(the repository always wins). A text-only Notion edit that keeps the block count
is caught the next time the document changes in the repository.

### Canonical hashing

The pre-commit hook runs Prettier over markdown, so the on-disk bytes can change
(formatting only) _after_ a sync recorded the hash. To avoid spurious drift, the
manifest stores the hash of the **Prettier-normalized** content
(`hashSource` in `scripts/lib/sync-manifest.ts`); formatting-only changes never
break the alignment.

### Notion updates in place

Re-publishing a page clears its blocks and appends the new ones **on the same
page id** — the page URL stays stable and nothing accumulates in the Notion
trash (the previous archive-and-recreate strategy did).

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
  "syncedAt": "2026-10-04T16:26:11.563Z",
  "targets": {
    "obsidian": { "path": "DeckUp/Documentación/Glossary.md", "hash": "sha256-…", "sourceHash": "sha256-…" },
    "notion": { "id": "…", "lastEditedTime": "…", "blockCount": 11, "sourceHash": "sha256-…" }
  }
}
```

`sourceHash` is stored **per target** (the canonical, Prettier-normalized hash of
the source at the moment that target was published), so a document synced to one
mirror is still correctly reported as pending for the other.

`scripts/lib/documents.ts` is the canonical registry (15 documents + the MADR
ADRs discovered on disk); both mirrors consume it, so they can never disagree on
_which_ documents they publish.

## Notion sync

- Root page: **DeckUp** — ID `3ee7d55f-d95e-8079-8ee8-f9dc00042699`
  (<https://app.notion.com/p/3ee7d55fd95e80798ee8f9dc00042699>, see SPEC.md §7).
- Create an internal integration token with _insert content_ permission on that
  page and expose it as `NOTION_DECKUP_TOKEN`; the page ID goes in `NOTION_PAGE_ID`.
- The script converts markdown to rich Notion blocks: headings, paragraphs,
  numbered and bulleted lists, to-dos, quotes, dividers, GitHub-style callouts
  (`> [!NOTE]`), code fences (Mermaid included), native tables, inline
  formatting (bold, italic, code, strikethrough, links) and images. A table of
  contents is inserted automatically when a document has three or more headings.
- Relative images are uploaded to Cloudinary when `CLOUDINARY_URL` is set
  (signed uploads, folder `deckup/docs`); otherwise they degrade to a caption.
- The payload is chunked at 100 blocks per request without splitting a table
  from its rows.
- Documents with an unchanged canonical `sourceHash` and a recorded `blockCount`
  are skipped; pass `--force` to re-publish them.
- Re-publishing updates the page **in place** (same id, blocks swapped), so the
  Notion trash stays empty and page URLs are stable.
- Last sync: 2026-10-05 — **23 pages** (15 documents + 8 ADRs).

## Obsidian sync

- Vault: **Ningendo Bee** — `~/Documents/Obsidian Vaults/Ningendo Bee`
  (override with `OBSIDIAN_VAULT_PATH`).
- Writes the 15 documents to `DeckUp/Documentación` and the 8 MADR ADRs to
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
