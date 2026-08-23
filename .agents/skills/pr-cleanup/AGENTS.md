# Contents

- `SKILL.md` – live-census, recovery, readiness, merge, supersession, retention, and post-merge workflow.
- `agents/openai.yaml` – skill-list metadata and default `$pr-cleanup` invocation.

# Guidelines

- Keep this copy synchronized with the `pr-cleanup` skill in Jungle and the personal monorepo template.
- Keep repository and organization scope dynamic; never hardcode an owner's repository list.
- Preserve mutation authority boundaries, exact-head readiness, non-force branch retention, post-merge verification, and the final live census.
- Do not add automatic branch deletion, force pushes, workflow cancellation, releases, deployments, or provider mutations.
- Pair any future deterministic mutation helper with focused tests and an audit-only default.
