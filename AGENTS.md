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
- Treat editorial imagery as an opt-in content feature. Before adding article banners, thumbnails, or explanatory figures, follow `docs/editorial-images.md` and use the `editorial-image-seo` skill when it is available. Do not infer that image count improves search ranking.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose. Preserve facts, exact terms, literals, quotations, links, and necessary uncertainty.
- Apply unreasonably robust programming when agent work is cheap. Prefer coherent cross-file correctness and focused deterministic evidence to a knowingly weaker design.
- Deliver ordinary single-owner changes by fast-forward push to `main` after repository checks. Escalate to a pull request when a change touches schemas or migrations, auth, billing, provider or deployment state, a public or consumed contract, a shared generated or lockfile convergence surface, or another active lane. Repository-owned bounded automation may keep its documented direct path. Never force-push.
- Model state so invalid states cannot exist. Parse foreign values from `unknown`. Use readable deterministic regression examples, and add property tests for laws, parsers, reducers, ordering, and round trips.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never replace them with sibling paths, Git submodules, or coordinated `main` assumptions.
- Extract a shared package only after two concrete consumers need the same stable interface. Keep shared packages product-neutral and keep product policy and composition in the consuming product.
- Use `@hraness/ui` for stable, portable primitives and tokens. Keep page composition, copy, state, and the local `/design` visual contract owned by the product.
- Freeze shared interfaces before parallel lanes begin. Give workspace manifests, lockfiles, generated registries, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep mandatory edit-time rules in the closest `AGENTS.md`, current multi-step procedures in `docs/`, executable contracts in types and tests, and rationale, evidence, synthesis, and plans in `kb/`. A KB scope hub can explain a rule but cannot override a guide.
- Treat `kb/` as one Obsidian-compatible vault. Markdown and Git are authoritative; catalogs, backlinks, embeddings, and graph views are derived.
- Treat `reading.status: published` as an explicit public boundary. Generate the public Reading registry with `bun run reading:generate`; production code never reads the vault.
- Put durable plans in `kb/plans/`. After material KB edits, percolate the changed note, run `bun run kb:refresh`, and finish with `bun run kb:check`. Parallel KB lanes use `bun run kb:check:lane` and leave final refresh to the integrator.
- Give each owned source boundary an `AGENTS.md` with exactly `# Contents` and `# Guidelines` when it needs rules beyond this guide.
- Run focused tests while editing and `bun run check` before handoff. The full check builds and scans both production and Direct outputs.
- Preserve unrelated changes. Commit only task-owned files. Use `bun run merge:queue -- submit --commit <oid> --label <label>` only when direct pushes to `main` are allowed; protected repositories should use GitHub's native pull-request merge queue.

<!-- hra-local-efficiency:start -->
- Preserve useful reasoning fan-out, but avoid unnecessary checkout fan-out. Prefer subagents in the current task for bounded research, review, diagnosis, and focused checks when they can safely share one working tree; create a separate task or worktree only for independently deliverable divergent edits, an isolated verification tree, or a different execution environment.
- Give each expensive focused validation command and external wait one owner. The integration owner reviews that evidence and runs the repository-required aggregate or final gate once after convergence. Reuse evidence only for the exact Git tree, command, lockfiles, toolchain, relevant environment, and validity period, and never to skip a required final integration, merge, release, deployment, or production-verification gate.
- On Hraness development machines, use `$hra-local-efficiency` and the installed host scheduler for heavyweight top-level commands when available. Keep ordinary work in the compute lane; give authenticated browser/dev-server/Chromium work one `browser-auth` owner and Mac-only validation one `mac-native` owner.
- When a CI or policy gate scans complete Git history, check out the exact governed SHA and fetch only the fully qualified governed refs before scanning. Preserve the complete-history gate and reject unexpected refs instead of importing unrelated concurrent heads.
- At closeout, record applicable branch, PR, check, merge, release, deployment, and production evidence. Archive only conclusively finished tasks, never from silence alone, and reclaim only freshly revalidated clean merged worktrees through the guarded exact-path flow.
<!-- hra-local-efficiency:end -->
