# Contents

- `merge-main.ts` – the stateless optimistic serializer for validated direct pushes to `origin/main`.
- `merge-main.test.ts` – argument, environment, safety, and local bare-repository integration coverage.

# Guidelines

- Keep the serializer stateless and dependency-free. Coordinate concurrent submissions through ordinary Git fast-forward behavior, then rebuild on the latest `origin/main` when another submission wins the race.
- Resolve submitted refs before integration, reject merge commits, sanitize inherited Git repository overrides, and do all replay and validation work in a task-owned detached temporary worktree.
- Validate with the frozen Bun install and root check. Push only the exact clean commit that passed validation, disable followed-tag publication, then fetch again and prove it is reachable from `origin/main`.
- Do not add queue databases, background workers, locks, priority, status, provider delivery, or force-push behavior. Repositories that protect `main` should use their provider's pull-request merge queue.
