# Personal website

A small static personal index built with Next.js and the public [`@hraness/ui`](https://github.com/hraness/ui) package. The same homepage renders inside a separate Direct workbench for deterministic UI development.

The build configs resolve the pinned v0.2.0 package's shipped TypeScript source for JavaScript imports. This is a narrow compatibility alias for Next.js: that release's prebuilt single-file bundle retains internal `use client` directives that Next rejects after the first statement. Styles still use the package's public CSS exports.

The template is intentionally not deployed. It has no database, authentication, reading list, feed, hidden form, or inherited brand identity.

## Customize

1. Edit `src/site.ts`. Replace the example name, introduction, projects, social links, and about copy.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the final canonical HTTPS origin.
3. Run `bun run dev` from this directory, or `bun run --filter @personal-monorepo/personal-website dev` from the repository root.

The footer appearance control persists `light`, `dark`, or `system` in localStorage. Storage and `prefers-color-scheme` access stay behind the app-owned `AppearancePort`; Direct replaces that browser adapter with an in-memory one.

## Direct

Run `bun run dev:direct`, then open the URL Vite prints. The workbench includes stable light, dark, and long-content scenarios. It renders `src/personal-homepage.tsx`, not a fixture-only copy.

The definition declares fixture coverage for the real homepage with
deterministic content and appearance state. Unit tests and build scans do not
exercise those rendering claims in a browser; use the included
`$direct-verify` skill to collect that evidence. LocalStorage,
operating-system theme changes, PostHog ingestion, Vercel configuration, and
public delivery remain direct requirements.

Use these checks before handoff:

```sh
bun run test
bun run typecheck
bun run lint
bun run build
bun run check:production-boundary
bun run build:direct
bun run check:direct-boundary
```

The two builds are deliberately separate: Next writes `.next`, while Vite writes `dist-direct`.

## Design system

Open `/design` during local development to inspect the public `@hraness/ui` Badge variants and the product-owned appearance control against the same tokens and styles as the homepage. This small static gallery is a visual contract for the primitives the starter actually uses, rather than a claim to cover the package's full catalog.

## Deploy to Vercel

1. Push the repository to your own GitHub account or organization.
2. In Vercel, create a project from the repository and set **Root Directory** to `personal-website`.
3. Keep the detected Next.js framework and the commands from `vercel.json`.
4. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin.
5. Deploy, attach the intended domain, then update `NEXT_PUBLIC_SITE_URL` if the canonical domain changed and redeploy.

No Vercel project or deployment is created by this template.

## Optional PostHog

Create and own a PostHog project separately, then set all of:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Analytics initializes only on the exact configured canonical HTTPS origin. The
included client sends one root-only pageview with memory-only persistence. A
final event filter drops the real path, query, fragment, referrer, title,
campaign, browser, device, and screen properties. Autocapture, session replay,
cookies, and person profiles are disabled, and preview deployments and
localhost stay silent. PostHog still receives the network request's IP address;
configure provider-side IP handling, consent, retention, and ingestion for your
jurisdiction and policy.
