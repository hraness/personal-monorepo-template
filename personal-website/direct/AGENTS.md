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
  derives light, dark, and long-content campaigns from the exact Direct
  catalog; catalog drift must fail closed. Use `--campaign dark-wide` for a
  focused campaign. The runner accepts exactly 12-300 seconds: use 12-30 in
  the edit loop and 60-300 per campaign for scheduled or manual discovery.
- Inspect each exact run below
  `artifacts/direct-bombadil/personal-monorepo-template-<campaign>/`. Preserve a
  failing `trace.jsonl`, its run manifest, and logs before retrying. Replay it
  with `bun run fuzz:direct -- --campaign <campaign> --replay <trace-path>`.
  Open actions, screenshots, snapshots, resources, and violations with
  `bunx bombadil browser inspect <run-directory>/bombadil`.
- Triage the first violated named property and the matching product extractor
  values. Promote every confirmed product defect to a deterministic unit or
  semantic browser regression, then keep the trace only when it adds useful
  reproduction evidence.
- Author safe actions around stable product controls. Do not add navigation,
  reload, history, form-submit, Enter-key, credential, provider, or unbounded
  actions merely to increase activity. Add named extractors and product
  temporal properties for meaningful state transitions rather than DOM churn.
- Keep appearance clicks restricted to visible, enabled, unchecked controls
  whose click point is inside the active viewport. Keep responsive viewport
  actions bounded to the declared campaign dimensions. Name the product
  snapshot `personalHomepage`, include active scenario and visible state, and
  require scenario-specific initial semantics without forbidding valid later
  appearance changes.
- Bombadil owns a local headless Chrome process and the exact localhost HTTP
  origin supplied by the runner. It is not production-browser, cross-origin,
  credential, provider, or public-delivery evidence. A raw trace may contain
  screenshots, labels, typed text, query values, and local paths; retain CI
  artifacts briefly and treat them as potentially sensitive.
- Bombadil 0.7.2 has no user-supplied seed and performs no shrinking. A passing
  random campaign is diagnostic evidence, not Direct coverage or release
  proof; a failed trace is the exact replay boundary.
- Keep the campaign descriptors on Direct's shared matrix, viewport, and
  exploration-policy config. Require both the shared `direct` snapshot and the
  product-owned `personalHomepage` snapshot in every campaign. Put interaction
  diversity and post-non-wait change requirements on
  `personalHomepageInteraction`, which excludes viewport fields. Attribute a
  compact snapshot change to `Click` and a full `personalHomepage` change to
  `SetViewport`; an unrelated action cannot satisfy either semantic signal.
  Latch the first ready homepage state for initial-world assertions so a later
  action cannot repair it. Bound startup
  readiness, then keep surface identity, heading, theme, and selected
  appearance as strict safety invariants after that first ready state; do not
  wrap repairable safety in bounded liveness. Calibrate DOM-node or listener
  growth from retained resource timelines before adding a numeric leak law.
- Build only to `dist-direct`. The Next application builds only to `.next`.
