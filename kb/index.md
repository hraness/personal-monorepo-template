---
aliases:
  - Repository knowledge base
kb_catalog: authored
---

# Knowledge base

This Git-backed Markdown vault is durable memory for the repository. Open
`kb/` itself as the vault. Markdown and Git are authoritative; catalogs,
backlinks, graph views, semantic indexes, repository-path context, and Git
projections are derived.

Start repository work with:

```sh
kb context <repository-path> --root kb --repo .
```

The command returns inherited `AGENTS.md` rules, curated scope hubs, and current
records whose exact `repository_scopes` own the requested path. Follow with
bounded links, metadata, text, or history queries only when needed.

## Record boundaries

- `articles/` holds self-contained captured sources and their local assets.
- `notes/` holds maintained concepts and synthesis; `notes/reading/` holds private reviewed sources for explicitly published Reading entries.
- `plans/` holds proposed through terminal coordination records.
- `riffs/` holds finished first-person notes cleaned from spoken or stream-of-consciousness drafts.
- `scopes/` holds curated repository-context hubs.

The [[scopes/repository--cdb4ee2aea69|repository context hub]] explains the
repository-wide rule boundaries. [[notes/documentation-ownership|Documentation
ownership]] records the durable split between guides, docs, executable
contracts, and KB context. [[notes/repository-seams|Repository seams]] records
the stable package boundaries that let repositories advance independently.

Git history is the maintenance log. Do not add generated backlink sections or
a second append-only fact store. Each record owns its metadata, links, and
typed outbound relationships.

## Maintenance

After material edits, run `bun run kb:refresh`, review the bounded percolation
findings in context, then run `bun run kb:check`. This front door is authored;
refresh leaves it unchanged. Render the exhaustive disposable inventory with
`bun run kb:catalog`.
