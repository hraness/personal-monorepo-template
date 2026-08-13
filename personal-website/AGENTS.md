# Contents

- `app/` contains the production Next.js entry, the small `/design` component gallery, metadata, global styles, and optional analytics mount.
- `src/` contains the real personal homepage, editable content, and the product-owned appearance port used by every composition.
- `direct/` contains the separate Vite Direct entry, strict worlds, scenarios, deterministic appearance adapter, focused tests, and emitted-output checks.
- `.env.example`, `next.config.ts`, and `vercel.json` document the production configuration boundary.
- `README.md` explains customization, local verification, and a user-owned Vercel and PostHog setup.

# Guidelines

- Keep the production site static, compact, and provider-free except for explicitly enabled, privacy-minimized PostHog pageviews.
- Keep personal copy in `src/site.ts`. Do not add a hidden contact form, authentication, database, reading list, or feed.
- Keep `/design` limited to the public primitives the template actually uses and render it with the production appearance adapter.
- Build the real homepage from `PersonalHomepage`; production and Direct must pass different adapters into that same component rather than fork it.
- Keep persistence, media queries, and document mutation behind `AppearancePort`. Persist only `light`, `dark`, or `system`.
- Activate analytics only when all PostHog variables exist and the browser origin exactly equals the configured canonical HTTPS origin. Keep autocapture, replay, cookies, and person profiles disabled.
- Keep `@hraness/direct` in development dependencies and out of the Next production graph. Build Next and Direct into independent output directories and run both boundary scans.
- Treat fixture coverage as evidence about the real UI and deterministic appearance adapter only. Browser storage, Vercel delivery, and PostHog ingestion require direct evidence.
