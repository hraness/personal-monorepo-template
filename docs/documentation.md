# Documentation ownership

Put each rule or explanation in the closest durable home that matches how it is used.

| Information | Authoritative home |
| --- | --- |
| Rules required before an edit | The closest inherited `AGENTS.md` |
| Current multi-step procedures and runbooks | `docs/` |
| Machine-enforced behavior | Types, tests, schemas, and deterministic checkers |
| Rationale, evidence, maintained synthesis, and plans | `kb/` |
| Human orientation and first steps | `README.md` |
| Internal and public prose rules | `WRITING.md` and `STYLE.md` |

Keep load-bearing constraints in `AGENTS.md` even when a KB note explains why they exist. Link a runbook to executable checks instead of restating their implementation. Update an existing KB note when a conclusion evolves, and use a KB plan when several edits or decisions must remain coordinated.

Run `bun run kb:refresh` and `bun run kb:check` after material KB changes. Run `bun run check` before handing off repository changes.
