# Contents

- `index.md` – short authored front door for the vault.
- `articles/` – self-contained source captures with local attachments.
- `notes/` – maintained concepts, synthesis, and private reviewed Reading sources.
- `plans/` – proposed through terminal design and implementation plans.
- `scopes/` – pull-based context hubs mapped to repository `AGENTS.md` guides.

# Guidelines

- Treat `kb/` as one Git-backed Markdown vault. Open this directory, not the repository root, as the vault.
- Use vault-root wikilinks without `.md`, such as `[[notes/example|example]]`. Use Markdown links for web sources and repository files outside `kb/`.
- Treat reusable concepts as ordinary notes with `type: concept`. Store typed outbound assertions under `relations` with lower-kebab-case predicates and exact vault-root target IDs; explain each assertion in prose or evidence.
- Put contextual relationships in prose or a compact `## Related` section. Never author reciprocal, inferred, transitive, or similarity-derived edges just to improve graph counts.
- Search titles, aliases, filenames, and existing notes before creating a page. Update the existing note when identity is clear.
- Put coordination artifacts in `plans/`, reusable current synthesis in `notes/`, and current operating instructions in repository guides or documentation.
- Treat `AGENTS.md` as the normative, always-loaded control plane and `scopes/` as optional rationale, history, examples, and graph routing. Keep every load-bearing edit-time rule in the applicable guide.
- Preserve source authority and voice. Integrate source captures through maintained notes instead of silently rewriting captured material.
- Publish Reading entries only through a reviewed `notes/reading/` note and the checked generator. Ordinary notes and captures remain private.
- Start repository work with `kb context <repository-path> --root kb --repo .`, then expand through bounded links, exact metadata, or search.
- After adding, moving, renaming, or materially revising a KB entry, use the `percolate-kb` skill on the changed note, then use `refresh-kb` or run `bun run kb:refresh` and finish with `bun run kb:check`.
- During parallel work, each lane edits only its owned notes and runs `bun run kb:check:lane`. The integrating agent performs the final refresh and normal check.
- Keep `index.md` concise and authored. Use `bun run kb:catalog` for an exhaustive disposable inventory.
