# Contents

- `SKILL.md` defines the reviewed capture-to-public-reading workflow.
- `references/entry-format.md` defines the only accepted digest and complete-note schemas.
- `scripts/reading.ts` validates vault evidence and renders the public registry.
- `scripts/sync-reading.ts` exposes generation, drift checking, and inbox reporting.
- `scripts/reading.test.ts` proves validation, privacy, provenance, and atomic-write behavior.
- `agents/openai.yaml` describes the skill in Codex interfaces.

# Guidelines

- Keep the projection deterministic and network-silent. The website must import only the generated module and must never read `kb/` at runtime.
- Treat `reading.status: published` as the sole publication opt-in. Draft notes and unreviewed captures remain private.
- Reject unsupported metadata, unverified quotations, duplicate provenance, tracking URLs, private vault links, and capture state that is unsafe to publish.
- Preserve both supported forms: concise public-article digests and complete reviewed notes with explicit republication basis.
- Run `bun test ./.agents/skills/percolate-reading/scripts` and `bun run reading:check` after changing this workflow.
