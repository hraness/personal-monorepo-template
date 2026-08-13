---
name: phase-orchestrator
description: >-
  Execute phased implementation plans in a repository with Codex
  collaboration tools, dependency gates, parallel agent lanes, validation, and
  review/fix loops. Use only when the user supplies a plan, checklist, or PRD
  and explicitly asks Codex to execute it in phases, delegate it to subagents,
  parallelize independent work, or orchestrate implementation. Do not use for a
  one-off edit, an ordinary multi-step task, or a plan the user only wants
  reviewed.
---

# Orchestrate implementation phases

Treat the user's plan as the scope contract and the closest `AGENTS.md` files as
the implementation authority. Keep the root Codex agent responsible for the
dependency graph, shared files, join gates, validation, and delivery.

## Hold the invariants

- Read the complete plan, root `AGENTS.md`, and every scoped `AGENTS.md` before
  implementation. Read any writing or style guide that governs changed prose.
- Keep repository-authored plans under `kb/plans/` and update that file as the
  execution record. A user-supplied inline or external plan remains the scope
  contract without being copied into the repository unless the user asks.
- Use `update_plan` for orchestration state. Keep at most one top-level step
  `in_progress`; describe concurrent lanes within that step.
- Use Codex collaboration tools for bounded work: `spawn_agent`,
  `send_message`, `followup_task`, `wait_agent`, `interrupt_agent`, and
  `list_agents`.
- Respect the active collaboration concurrency limit. Keep one slot for the
  root orchestrator; when four slots are available, run at most three workers.
- Remember that Codex agents share the same filesystem. Assign every writer an
  explicit absolute working directory and non-overlapping owned paths.
- Preserve all user-owned changes. Never revert, stage, commit, or overwrite an
  unrelated change.
- Follow the repository's documented package manager and command surface. This
  template uses Bun; do not introduce another package manager or lockfile.
- Do not commit, push, open or modify a PR, merge, deploy, or make another
  external write unless the user authorized that stopping point.
- Never rebase or amend a pushed branch, force-push, or use destructive VCS
  commands unless the user explicitly requested the exact operation.
- Give the user a concise commentary update during long-running work at least
  once per minute.

## Orient before spawning

1. Confirm the repository root, current branch, `git status`, relevant remotes,
   and existing changes.
2. Read the plan and its supporting specifications in full. Record requested
   phases, acceptance criteria, exclusions, and stopping point.
3. Discover focused checks, aggregate checks, generated-file policy,
   migrations, release rules, CI gates, and delivery conventions for the paths
   in scope.
4. Map each deliverable to its dependencies, owned paths, shared files, and
   validation evidence.
5. Ask only when a missing choice changes the result materially or requires new
   authority.

## Build the phase graph

Classify every node before delegating:

- **Convergence:** shared contracts, schemas, manifests, lockfiles, barrels,
  migrations, generated indexes, integration, or release files. Give these one
  owner, normally the root agent.
- **Parallel lane:** bounded work with satisfied inputs and disjoint writes.
- **Join gate:** integrate all prerequisite lanes and prove their contracts
  compose before downstream work starts.
- **Validation or review:** read-heavy work against a stable diff; run it in
  parallel only when the evidence cannot change underneath it.

For each fan-out, record prerequisites, lane owners, exact paths, deferred
shared files, focused checks, join criteria, and isolation. Freeze shared
interfaces before parallel implementation.

Prefer the shared checkout for read-only workers and writers with provably
disjoint paths. Serialize work when paths overlap. Use Git worktrees only when
the user has authorized branch creation and isolated commits help integration;
otherwise do not create orchestration branches as a side effect.

## Execute a phase

### 1. Open the phase

- Re-read its criteria and prior results.
- Confirm prerequisites, write ownership, and isolation.
- Mark the phase or fan-out step `in_progress`.

### 2. Delegate bounded lanes

Give each worker enough context to act without inferring parent-only state:

```text
Implement {phase_or_lane} in {absolute_working_directory}.

Plan and criteria: {plan_path_or_excerpt_and_acceptance_criteria}
Dependencies: {prior_results}
Repository rules: {applicable_guides}
Existing user changes: {relevant_status}

Ownership:
- Own only {paths}.
- Defer {shared_files} to the root integration owner.
- Other Codex agents share this filesystem. Do not revert or overwrite their work.

Validate with: {focused_commands}
Commit policy: {authorized_or_do_not_commit}

Return changed files, behavior, exact validation results, deviations, blockers,
risks, and integration notes.
```

Continue useful integration or read-only work while workers run. Resume the
same worker with `followup_task` when continuity helps; use a fresh agent for an
independent review.

### 3. Inspect every result

- Read each worker's result and inspect the actual diff and repository status.
- Confirm the worker stayed within its path ownership.
- Re-run the smallest documented checks that prove the lane's behavior.
- Send bounded corrections back with `followup_task`.
- Record an unavailable or failed check exactly; do not silently replace it
  with weaker evidence.

### 4. Pass the join gate

Wait for every prerequisite lane, integrate shared files once, prove no intended
output was omitted, then run contract and cross-lane checks. Do not advance just
because each lane passes alone.

### 5. Review and fix

After the phase diff is stable, use a fresh Codex agent to review correctness,
acceptance criteria, repository rules, security, ownership boundaries, tests,
and integration risks. Let the reviewer patch only concrete bounded issues,
then inspect those edits and re-run affected checks. Require a clear no-op when
the review is clean.

### 6. Close the phase

Record `Done`, `Partial`, or `Blocked`, including behavior, files, validation,
review outcome, authorized commit identifiers, deviations, risks, and manual
checks. Update the plan before starting a dependent phase.

## Validate in the repository

- Run narrow workspace or file-level commands while iterating.
- Use `bun run kb:check:lane` when a parallel lane changes only its owned KB
  notes. The integration owner runs `bun run kb:refresh`, reviews findings in
  context, and finishes with `bun run kb:check` after updating a
  repository-owned plan.
- Run the focused Direct checks documented by the owning package when a phase
  changes a deterministic composition or its production-exclusion boundary.
- Inspect the root scripts before choosing an aggregate gate. In this template,
  run `bun run check` for the stable integrated diff.
- Run any additional guide, structure, build, deployment, or delivery checks
  named by the root guide and changed workspaces.
- Distinguish failures caused by the phase from pre-existing failures in the
  user's working tree. Report both with exact commands and counts.

## Finish the requested scope

After all requested phases reach a terminal state:

1. Prove every intended worker result is present in the integration tree.
2. Run the repository-appropriate aggregate validation.
3. Perform a fresh final review of the complete diff and validate any fixes.
4. Stop at the authorized delivery point.
5. Report the repository, branch or worktree, exact checks, skipped checks,
   residual risks, and anything still pending.

Do not implement future phases merely because they appear in the plan.

This workflow is adapted from an MIT-licensed upstream repository skill.
