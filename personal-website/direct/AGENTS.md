# Contents

- `world.ts` parses the bounded version 1 JSON world from `unknown`.
- `scenarios.ts` defines stable light, dark, and long-content scenarios with exact fixture and direct coverage claims.
- `deterministic-appearance-port.ts` implements the product-owned appearance port without browser storage or media queries.
- `session.ts` owns Direct activation, probe counters, cancellation, and cleanup.
- `main.tsx`, `workbench.tsx`, `workbench.css`, and `index.html` form the non-shipping Vite workbench.
- `check-build-boundaries.ts` checks production exclusion and positive Direct output independently.
- Colocated tests cover world rejection, catalog drift, session lifecycle, the deterministic adapter, and boundary failures.
- The Bombadil campaign, three-scenario matrix, and runner bind shared
  conservative exploration and exact trace attestation to the light, dark,
  and long-content homepage worlds.

# Guidelines

- Render the real `PersonalHomepage` and use only product-owned ports from `src/`.
- Reject unknown world keys, unsupported versions, invalid URLs, duplicate identifiers, inconsistent resolved themes, and exceeded bounds.
- Display malformed explicit activation as an error. Never substitute the default scenario after a rejected query.
- Install the session through `installDirectBrowser` with its fail-closed fetch firewall and named violation counters.
- Keep fixture claims limited to deterministic UI and adapter behavior. Leave localStorage, media queries, analytics delivery, Vercel delivery, and production-browser behavior as direct claims.
- Keep Bombadil diagnostic-only. Use the shared conservative actions and exact
  trace attestation; do not treat random exploration as coverage evidence.
- Run `bun run fuzz:direct -- --time-limit 20s` after changing the homepage,
  appearance control, Direct world, session, or campaign. The default matrix
  runs light, dark, and long-content worlds; use `--campaign homepage.dark`
  for a focused campaign and 45-120 seconds per world for scheduled or manual
  discovery runs.
- Inspect each exact run below
  `artifacts/direct-bombadil/personal-monorepo-template-<world>/`. Preserve a
  failing `trace.jsonl`, its run manifest, and logs before retrying. Replay it
  with `bun run fuzz:direct -- --campaign <world> --replay <trace-path>`.
- Triage the first violated named property and the matching product extractor
  values. Promote every confirmed product defect to a deterministic unit or
  semantic browser regression, then keep the trace only when it adds useful
  reproduction evidence.
- Author safe actions around stable product controls. Do not add navigation,
  reload, history, form-submit, Enter-key, credential, provider, or unbounded
  actions merely to increase activity. Add named extractors and product
  temporal properties for meaningful state transitions rather than DOM churn.
- Bombadil 0.7.2 has no user-supplied seed and performs no shrinking. A passing
  random campaign is diagnostic evidence, not Direct coverage or release
  proof; a failed trace is the exact replay boundary.
- Build only to `dist-direct`. The Next application builds only to `.next`.
