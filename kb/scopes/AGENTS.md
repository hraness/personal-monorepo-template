# Contents

- `*.md` – deterministic, scope-addressed context hubs referenced by repository `AGENTS.md` markers.

# Guidelines

- Keep one hub per exact normalized repository scope, with `type: agent-context` and the matching `scope` in frontmatter.
- Treat each hub as explanatory durable context. The owning source guide remains normative and retains every load-bearing edit-time constraint.
- Derive each hub path and marker with `kb agents identity <scope>`; do not invent alternate IDs.
- Keep every hub and guide marker reciprocal.
- After changing a hub or mapping, run `bun run kb:refresh`, inspect findings in context, and finish with `bun run kb:check`.
