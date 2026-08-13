# Contents

- `*.md` – proposed, accepted, active, and terminal plans that participate in the knowledge graph.

# Guidelines

- Put future-facing proposals, RFCs, execution audits, and implementation plans here under descriptive kebab-case filenames.
- Use a plan when a document coordinates change. Put reusable current understanding in `kb/notes/` and current operating instructions in repository documentation or guides.
- Start each plan with `type: plan`, a concise `description`, a kebab-case `area`, and one status from `proposed`, `accepted`, `in-progress`, `blocked`, `completed`, `superseded`, or `cancelled`.
- Give a repository-related plan a bounded `repository_scopes` list of exact normalized repository-relative files or directories. Do not use globs.
- State an observable outcome, context, scope and non-goals, constraints and decisions, dependency-ordered work, verification, and recovery. Small plans may omit empty optional sections.
- Keep decisions, review findings, execution state, and reproducible evidence in the plan itself. Do not create separate progress or completion files for the same plan.
- On completion, retain the plan as history and add compact `## Result` and `## Durable memory` sections.
- Connect plans to existing notes only where the relationship helps a future reader, and explain it in prose.
- After a material edit, percolate the changed plan, run `bun run kb:refresh`, review findings in context, and finish with `bun run kb:check`.
