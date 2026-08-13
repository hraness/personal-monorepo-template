# Contents

- `SKILL.md` – cautious disk-audit, classification, deletion, and verification workflow.
- `scripts/worktree-cleanup.ts` – audit-first removal of exact registered, clean, merged Git worktrees.
- `scripts/worktree-cleanup.test.ts` – parser, safety-classification, and argument coverage.
- `agents/openai.yaml` – skill-list metadata and default invocation prompt.

# Guidelines

- Default to read-only auditing and require exact paths for deletion.
- Never add force deletion, recursive directory sweeps, branch deletion, or dirty-state overrides.
- Keep worktree eligibility dependent on a fresh remote-target fetch, an empty porcelain status, and an ancestor check.
- Protect both the actual primary worktree and the worktree from which the script is invoked.
- Default to the remote's symbolic HEAD and require `--target <remote>/<branch>` when that target is unavailable or intentionally different.
- Treat user state and application databases as non-cache data unless the user explicitly accepts their loss.
