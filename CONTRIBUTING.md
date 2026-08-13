# Contributing

Install the pinned Bun version and repository dependencies, then run the full
gate before opening a pull request:

```sh
bun install --frozen-lockfile
bun run check
```

Keep changes focused. Add deterministic tests for behavior and boundary
changes. Direct fixtures must state what they replace and must never be
described as evidence for Vercel, PostHog, browser storage, or another live
system.
