# Contents

- `personal-website/` – the deployable Next.js personal site and its separate Direct deterministic composition.
- `kb/` – the authored, Git-backed Markdown knowledge base.
- `.agents/skills/` – discoverable agent workflows for KB work, disk audits, Direct, and phased parallel execution.
- `scripts/` – the small stateless main-branch serializer and its tests.
- `.github/workflows/` – frozen-install repository validation.
- `package.json`, `bunfig.toml`, and `tsconfig.json` – the Bun workspace and root command surface.

# Guidelines

- Use Bun 1.3.14 for installs, scripts, and tests. Keep the committed `bun.lock` synchronized and use `catalog:` for shared external versions.
- Preserve the production boundary around Direct. Product-owned interfaces may be shared, but `@hraness/direct`, worlds, fixtures, scenario catalogs, and workbench code stay out of the production graph.
- Keep the personal site statically renderable and provider-light. Do not add authentication, databases, or user tracking without an explicit product need and documented privacy behavior.
- Treat `kb/` as one Obsidian-compatible vault. Markdown and Git are authoritative; catalogs, backlinks, embeddings, and graph views are derived.
- Put durable plans in `kb/plans/`. After material KB edits, percolate the changed note, run `bun run kb:refresh`, and finish with `bun run kb:check`. Parallel KB lanes use `bun run kb:check:lane` and leave final refresh to the integrator.
- Give each owned source boundary an `AGENTS.md` with exactly `# Contents` and `# Guidelines` when it needs rules beyond this guide.
- Run focused tests while editing and `bun run check` before handoff. The full check builds and scans both production and Direct outputs.
- Preserve unrelated changes. Commit only task-owned files. Use `bun run merge:queue -- submit --commit <oid> --label <label>` only when direct pushes to `main` are allowed; protected repositories should use GitHub's native pull-request merge queue.
