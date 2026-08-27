# Contents

- `world.ts` parses the bounded version 1 JSON world from `unknown`.
- `scenarios.ts` defines stable light, dark, and long-content scenarios with exact fixture and direct coverage claims.
- `deterministic-appearance-port.ts` implements the product-owned appearance port without browser storage or media queries.
- `session.ts` owns Direct activation, probe counters, cancellation, and cleanup.
- `main.tsx`, `workbench.tsx`, `workbench.css`, and `index.html` form the non-shipping Vite workbench.
- `check-build-boundaries.ts` checks production exclusion and positive Direct output independently.
- Colocated tests cover world rejection, catalog drift, session lifecycle, the deterministic adapter, and boundary failures.
- The Bombadil campaign and runner bind shared conservative exploration and
  exact trace attestation to the light homepage scenario.

# Guidelines

- Render the real `PersonalHomepage` and use only product-owned ports from `src/`.
- Reject unknown world keys, unsupported versions, invalid URLs, duplicate identifiers, inconsistent resolved themes, and exceeded bounds.
- Display malformed explicit activation as an error. Never substitute the default scenario after a rejected query.
- Install the session through `installDirectBrowser` with its fail-closed fetch firewall and named violation counters.
- Keep fixture claims limited to deterministic UI and adapter behavior. Leave localStorage, media queries, analytics delivery, Vercel delivery, and production-browser behavior as direct claims.
- Keep Bombadil diagnostic-only. Use the shared conservative actions and exact
  trace attestation; do not treat random exploration as coverage evidence.
- Build only to `dist-direct`. The Next application builds only to `.next`.
