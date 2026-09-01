# Personal monorepo template

Build a personal website, a Git-backed Markdown knowledge base, reusable Codex
skills, and a deterministic browser workbench from one repository.

The useful result is visible in the first session: your name is on a local
site, a durable note lives beside it, the real interface can open in named test
states, and one command can prove the repository is ready to hand off.

This is a template, not a hosted product. It contains no Hraness identity,
icon, authentication, database, RSS content, inherited notes, books, Vercel
account, domain, or analytics project. You supply the identity, material, and
provider accounts. The repository supplies the working boundaries.

## Create your repository

1. Click **Use this template** on GitHub. Choose visibility for the notes you
   expect to keep here.
2. Clone the generated repository:

   ```sh
   git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
   cd YOUR-REPOSITORY
   ```

3. Install [Bun 1.3.14](https://bun.sh/) and Node.js 24, then install the frozen
   dependency graph:

   ```sh
   bun install --frozen-lockfile
   ```

The initial install reads pinned public Hraness packages from GitHub tags. The
lockfile fixes the complete graph after that.

## First proof: make it yours

Follow this path before exploring the rest of the repository:

1. Replace the example identity and links in
   `personal-website/src/site.ts`. Set the generated repository's confidential
   reporting route in `SECURITY.md`.
2. Start the real personal site:

   ```sh
   bun run dev
   ```

3. Create a durable Markdown note under `kb/notes/`, then check the vault lane
   without writing shared derived state:

   ```sh
   bun run kb:check:lane
   ```

4. Open named light, dark, and long-content states of the real homepage in the
   separate Direct workbench:

   ```sh
   bun run dev:direct
   ```

5. Prove lint, types, tests, dependency boundaries, KB policy, both builds, and
   the production boundary together:

   ```sh
   bun run check
   ```

At this point you have changed the identity, rendered the product, authored
durable knowledge, exercised repeatable UI states, and run the same gate as CI.

## One repository, four authorities

| Authority | What it owns | What it does not own |
| --- | --- | --- |
| `personal-website/` | Public routes, identity, projects, Reading, Bookshelf, SEO, appearance, and optional analytics | Private notes, provider accounts, and Direct-only fixtures |
| `kb/` | Authored Obsidian-compatible Markdown, sources, plans, captures, links, and repository context | Production page rendering and generated public claims |
| `.agents/skills/` | Focused, inspectable procedures for agents working in this repository | Ambient permission or an external service |
| `scripts/`, Direct, and CI | Deterministic development states, release boundaries, validation, and an optional trusted-main serializer | Hosting, provider delivery, or a general-purpose merge queue |

The public Reading path crosses those authorities deliberately:

```text
private or working capture in kb/
  -> maintained note with reading.status: published
  -> checked generated TypeScript registry
  -> static page, metadata, sitemap, and Atom entry
```

Production never reads the vault and never fetches source content. Direct uses
the real shared homepage, but its browser bridge and fixtures are rejected from
the production build.

## The working interfaces

```sh
bun run dev             # Next.js personal website
bun run dev:direct      # deterministic Direct workbench
bun run check           # complete local and CI gate
bun run check:knip      # unused files, exports, and dependencies
bun run kb:catalog      # disposable complete vault listing
bun run kb:doctor       # optional KB capability diagnostics
bun run reading:inbox   # captures without a maintained reading note
bun run reading:check   # note policy and generated-registry drift
```

The repository starts with these surfaces:

| Surface | Included proof |
| --- | --- |
| Personal site | Next.js homepage, project and social links, About, Reading, Bookshelf, appearance control, discovery metadata, and Vercel configuration |
| Knowledge base | Authored front door, notes, plans, captures, repository context, exact search, links, metadata, and graph analysis |
| Direct | Named light, dark, and long-content worlds built from the real shared homepage |
| Agent workflows | KB capture and writing, reasoning, PR cleanup, disk reclamation, Direct, Reading, and phased-work skills |
| Delivery | Frozen install and `bun run check` in CI, plus an optional stateless serializer for trusted direct-to-`main` repositories |

## Customize the public site

Edit `personal-website/src/site.ts` for ordinary identity, project, and social
changes. The app-level [README](personal-website/README.md) documents the source
boundary, design surface, Direct scenarios, and environment variables.

The site consumes [`@hraness/ui`](https://github.com/hraness/ui) at `v0.4.3`
for accessible product-neutral components, glyphs, geometry, and CSS tokens.
It owns a small system-font grammar and appearance adapter locally, so it does
not inherit private fonts or Hraness brand assets. The pinned UI release exposes
`Badge` as its compact label primitive; unreleased component work is not
assumed.

### Publish it on Vercel

1. Import your generated GitHub repository into Vercel.
2. Set **Root Directory** to `personal-website`.
3. Keep the detected Next.js framework and the commands in
   `personal-website/vercel.json`.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical production HTTPS origin.
5. Deploy, attach the final domain, and verify the canonical URL directly.

The template does not create or control a Vercel account, project, domain, or
deployment.

### Publish selected reading notes

Web and PDF captures remain under `kb/`. Only maintained notes at
`kb/notes/reading/<slug>.md` with `reading.status: published` enter the site:

```sh
bun run reading:inbox
bun run reading:generate
bun run reading:check
```

The projector checks source metadata, provenance, public fields, quotation
limits, and the generated-file boundary. Production imports only
`personal-website/app/reading/entries.generated.ts`. The starter registry is
empty.

Bookshelf data lives in `personal-website/app/bookshelf/books.ts` and also
starts empty. Reading entries produce static `/reading` pages and
`/reading/atom.xml`. The site includes canonical, Open Graph, Twitter, and
JSON-LD metadata plus `robots.txt`, `sitemap.xml`, and `manifest.webmanifest`.

### Add editorial images only when they help

There is no starter banner requirement. When a first-party article benefits
from an identifying or explanatory image, follow the
[optional editorial-image procedure](docs/editorial-images.md). One typed
record keeps the visible figure, responsive dimensions, alt text, caption,
social metadata, schema, feed enclosure, image sitemap, and provenance aligned.
Use the `editorial-image-seo` Codex skill when available. Do not add decorative
images to meet an assumed SEO quota.

### Add narrow analytics when wanted

The site works without analytics. To opt in, create a PostHog project and set
all three variables in Vercel:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The client initializes only at the exact canonical HTTPS origin. It uses
memory-only persistence and a strict root-page property filter. Cookies, broad
autocapture, session replay, and person profiles stay disabled. Development and
Preview domains stay silent. PostHog still receives the request IP address, so
you own provider-side IP handling, consent, retention, governance, and
ingestion verification.

## Work with repeatable UI states

[`@hraness/direct`](https://github.com/hraness/direct) gives browser agents
named UI states without placing fixtures in the production graph:

```sh
bun run dev:direct
```

The starter declares light, dark, and long-content states. Automated checks
validate their worlds, activation, session manifest, adapter lifecycle, and
emitted boundaries. Those checks do not drive a browser, so visual rendering
remains `not-exercised` until an agent follows the included `$direct-verify`
workflow. Browser storage, operating-system theme changes, Next.js hydration,
PostHog, Vercel, DNS, and public delivery require direct evidence.

`bun run check` builds Next.js and Direct independently. It scans a nonempty
production output for forbidden Direct markers, then positively checks the
Direct output for both the browser bridge and real shared UI.

## Keep durable knowledge beside the product

[`@hraness/kb`](https://github.com/hraness/kb) treats Markdown and Git as the
authority. The starter uses an authored front door, avoiding a shared generated
catalog during parallel work.

```sh
bun run kb:check:lane   # parallel lane, no shared catalog write
bun run kb:refresh      # integrating writer refreshes derived views
bun run kb:check        # vault and repository-context policy
bun run kb:catalog      # exhaustive disposable catalog
```

Exact search, metadata, links, graph analysis, and repository context work
locally. Semantic search is optional and downloads a local model on first use.
Web and PDF capture skills use the installed KB CLI. The Reading skill reviews
selected captures and generates a network-silent public projection. Browser,
media, OCR, and platform-specific capabilities remain optional and are reported
by `bun run kb:doctor`.

Repository visibility also controls KB visibility. A public generated
repository creates a public vault. Keep private notes in a private repository
or a separate private vault.

## Give agents bounded procedures

Each included skill has its own `SKILL.md`. Agents should load the smallest
applicable workflow and follow the closest `AGENTS.md` before editing. The
included procedures cover:

- KB query, planning, percolation, capture, and refresh;
- faithful cleanup of dictated first-person notes;
- auditable web and PDF capture plus reviewed Reading projection;
- Direct adoption and visual verification without production leakage;
- open and stale PR reconciliation, recovery, and supersession;
- guarded cleanup of explicitly approved clean merged worktrees;
- bounded parallel execution with join gates; and
- assumption audits, weighted decisions, first principles, and question
  reformulation.

A skill is an inspectable local procedure. It does not grant ambient authority
or create an external account.

## Land a validated commit

For a trusted repository that permits direct pushes to `main`, the local
serializer replays explicit commits onto the newest `origin/main` in a detached
temporary worktree, installs the frozen graph, runs the full check, proves the
candidate stayed clean, and attempts an ordinary non-force push:

```sh
bun run merge:queue -- submit \
  --commit HEAD \
  --label "customize personal site"
```

If `main` moves first, the command rebuilds and revalidates the candidate. Git's
atomic ref update is the cross-machine serializer. There is no daemon,
database, force push, or provider credential.

This is intentionally smaller than a service-backed merge queue. It has no
status service, priority, crash-recovery database, affected-work planner, or
deployment verification. Branch protection that forbids direct pushes will
reject it. Teams and protected repositories should use pull requests and their
provider's merge queue.

## Questions before you start

### Does this publish my notes?

Repository visibility publishes whatever is committed. The website publishes
only checked Reading projections. Use a private repository or separate vault
for private material.

### Do I need Vercel, PostHog, or a database?

No. Local development, the static content paths, the KB, Direct, and validation
work without them. Vercel and PostHog are optional provider integrations. No
database or authentication layer is included.

### Is this a Hraness-branded starter?

No. It reuses public product-neutral packages and quiet geometry, but contains
no Hraness identity, icon, private typography, or inherited content.

### What should I change first?

Change `personal-website/src/site.ts`, run `bun run dev`, add one note, inspect
the Direct states, then run `bun run check`. That path tests the repository's
four authorities before you add more surface area.

## License

Template-authored files are available under the [MIT License](LICENSE).
[Third-party software](THIRD_PARTY.md) keeps its own notices and licenses.
