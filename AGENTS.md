<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `personal-website/` – the deployable Next.js personal site, static Reading and Bookshelf surfaces, Atom and SEO discovery, and separate Direct deterministic composition.
- `docs/` – current repository procedures and ownership boundaries.
- `kb/` – the authored, Git-backed Markdown knowledge base.
- `.agents/skills/` – discoverable agent workflows for KB work, disk audits, Direct, and phased parallel execution.
- `scripts/` – the small stateless main-branch serializer and its tests.
- `.github/workflows/` – frozen-install repository validation.
- `WRITING.md` and `STYLE.md` – internal and public prose contracts.
- `package.json`, `bunfig.toml`, and `tsconfig.json` – the Bun workspace and root command surface.

# Guidelines

- Use Bun 1.3.14 for installs, scripts, and tests. Keep the committed `bun.lock` synchronized and use `catalog:` for shared external versions.
- Preserve the production boundary around Direct. Product-owned interfaces may be shared, but `@hraness/direct`, worlds, fixtures, scenario catalogs, and workbench code stay out of the production graph.
- Keep the personal site statically renderable and provider-light. Do not add authentication, databases, or user tracking without an explicit product need and documented privacy behavior.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose. Preserve facts, exact terms, literals, quotations, links, and necessary uncertainty.
- Apply unreasonably robust programming when agent work is cheap. Prefer coherent cross-file correctness and focused deterministic evidence to a knowingly weaker design.
- Model state so invalid states cannot exist. Parse foreign values from `unknown`. Use deterministic regression examples, and add property tests for laws, parsers, reducers, ordering, and round trips.
- Keep mandatory edit-time rules in the closest `AGENTS.md`, current multi-step procedures in `docs/`, executable contracts in types and tests, and rationale, evidence, synthesis, and plans in `kb/`. A KB scope hub can explain a rule but cannot override a guide.
- Treat `kb/` as one Obsidian-compatible vault. Markdown and Git are authoritative; catalogs, backlinks, embeddings, and graph views are derived.
- Treat `reading.status: published` as an explicit public boundary. Generate the public Reading registry with `bun run reading:generate`; production code never reads the vault.
- Put durable plans in `kb/plans/`. After material KB edits, percolate the changed note, run `bun run kb:refresh`, and finish with `bun run kb:check`. Parallel KB lanes use `bun run kb:check:lane` and leave final refresh to the integrator.
- Give each owned source boundary an `AGENTS.md` with exactly `# Contents` and `# Guidelines` when it needs rules beyond this guide.
- Run focused tests while editing and `bun run check` before handoff. The full check builds and scans both production and Direct outputs.
- Preserve unrelated changes. Commit only task-owned files. Use `bun run merge:queue -- submit --commit <oid> --label <label>` only when direct pushes to `main` are allowed; protected repositories should use GitHub's native pull-request merge queue.
