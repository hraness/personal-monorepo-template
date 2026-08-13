# Contents

- `query-kb/` – scoped knowledge-base retrieval.
- `refresh-kb/` – knowledge-graph refresh and validation.
- `percolate-kb/` – evidence-backed concept and relationship promotion.
- `plan-kb/` – durable implementation planning in the knowledge base.
- `riff/` – faithful cleanup of dictated or stream-of-consciousness notes.
- `save-url-kb/` – auditable public and signed-in web capture.
- `save-pdf-kb/` – auditable PDF conversion with OCR and image evidence.
- `direct-setup/` – deterministic Direct composition design and production exclusion.
- `direct-verify/` – evidence-based verification of Direct compositions.
- `reclaim-disk-space/` – cautious disk and Git worktree cleanup.
- `phase-orchestrator/` – phased execution with Codex collaboration agents.
- `assumption-audit/` – load-bearing assumption discovery and testing.
- `decision-matrix/` – weighted option comparison with sensitivity analysis.
- `first-principles-thinking/` – reconstruction from fundamental constraints.
- `question-forge/` – reformulation of stuck, loaded, or defensive questions.

# Guidelines

- Keep each skill self-contained with `SKILL.md`, `AGENTS.md`, and matching `agents/openai.yaml` metadata.
- Keep trigger descriptions precise and workflows portable across repositories cloned from this template.
- Put deterministic repeated operations in tested scripts instead of asking agents to rewrite them.
- Preserve upstream attribution and license notices for adapted public resources.
- Update a skill's metadata and directory guide when its trigger, resources, or default invocation changes.
- Validate changed skill folders with the installed Codex skill validator when available, and run every changed script's focused tests.
