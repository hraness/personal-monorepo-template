# Personal monorepo template

An agent-friendly monorepo template for a personal website, Markdown knowledge
base, Direct, and reusable Codex skills. It combines a quiet Hraness-inspired
Next.js site, public Hraness UI components, a Git-backed Markdown knowledge
base, optional PostHog analytics, and a simple path for landing validated
commits on `main`.

The repository is a template, not a deployed product. It contains no Hraness
identity, icon, authentication, database, RSS feed, inherited reading notes, or
inherited books. Its empty Reading, Bookshelf, and Atom surfaces are ready for
the generated repository owner's material.

## Start here

1. Click **Use this template** on GitHub and create a repository with the
   visibility appropriate for your notes.
2. Clone the generated repository and enter it:

   ```sh
   git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
   cd YOUR-REPOSITORY
   ```

3. Install [Bun 1.3.14](https://bun.sh/) and Node.js 24.
4. Install the frozen workspace:

   ```sh
   bun install --frozen-lockfile
   ```

5. Replace the example identity and links in
   `personal-website/src/site.ts`, then configure the generated repository's
   confidential reporting route in `SECURITY.md`.
6. Start the personal website:

   ```sh
   bun run dev
   ```

7. Run the complete local gate before handoff:

   ```sh
   bun run check
   ```

The first installation reads the public Hraness packages from their pinned
GitHub tags. The lockfile fixes the complete dependency graph after that. The
current `@hraness/ui` tag exposes `Badge` as its compact label primitive; newer
unreleased component work is intentionally not assumed here.

## What is included

| Area | Purpose |
| --- | --- |
| `personal-website/` | Next.js personal index, Reading, Bookshelf, Atom and SEO discovery, design primitives, appearance control, optional PostHog, Vercel configuration, and Direct workbench |
| `kb/` | Authored Obsidian-compatible Markdown vault for notes, plans, captures, private reading sources, and repository context |
| `.agents/skills/` | Codex-discoverable KB capture and writing, reasoning, disk reclamation, Direct, and phased-work skills |
| `docs/`, `WRITING.md`, `STYLE.md` | Documentation ownership plus internal and public prose contracts |
| `scripts/` | Stateless serializer for trusted direct-to-`main` workflows |
| `.github/workflows/ci.yml` | Frozen install followed by the same `bun run check` used locally |

The shared command surface stays intentionally small:

```sh
bun run dev             # Next.js personal website
bun run dev:direct      # deterministic Direct workbench
bun run check           # lint, types, tests, Knip, KB policy, both builds, boundary scans
bun run check:knip      # unused files, exports, and dependency declarations
bun run kb:catalog      # disposable complete vault listing
bun run kb:doctor       # optional KB capability diagnostics
bun run reading:inbox   # captures with no maintained reading note
bun run reading:check   # validate notes and generated registry drift
```

## Personal website

The homepage keeps the useful parts of [hraness.com](https://hraness.com): a
compact column, a name and introduction, project and social links, an about
section, Reading and Bookshelf links, restrained typography, and a
Light/Dark/System control in the footer.
The footer has no inherited wordmark or brand mark.

The site consumes [`@hraness/ui`](https://github.com/hraness/ui) at `v0.4.3`
for accessible, product-neutral components, social and appearance glyphs,
quiet-site geometry, and CSS tokens. The original
Hraness theme layer is private, so the template owns a small system-font site
grammar and appearance adapter locally. This keeps customization clear and
avoids licensed private fonts and brand assets.

Edit `personal-website/src/site.ts` for ordinary customization. The app-level
[README](personal-website/README.md) explains its source boundary, Direct
scenarios, design surface, and environment variables.

### Deploy to Vercel

Deployment is deliberately left to the repository owner:

1. Import the generated GitHub repository into Vercel.
2. Set **Root Directory** to `personal-website`.
3. Keep the detected Next.js framework and the commands in
   `personal-website/vercel.json`.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical production HTTPS origin.
5. Deploy, attach the final domain, and verify the canonical URL directly.

No Vercel account, project, domain, or deployment is created by this template.

### Reading, bookshelf, and discovery

Web and PDF captures remain under `kb/`. Only maintained notes at
`kb/notes/reading/<slug>.md` with `reading.status: published` enter the
website:

```sh
bun run reading:inbox
bun run reading:generate
bun run reading:check
```

The projector verifies source metadata, provenance, public fields, quotation
limits, and the generated-file boundary. Production imports only
`personal-website/app/reading/entries.generated.ts`; it never reads the vault
or fetches source content. The starter registry is empty.

Bookshelf data lives in `personal-website/app/bookshelf/books.ts` and also
starts empty. It is typed, file-based, and provider-free. Reading entries drive
the static `/reading` pages and `/reading/atom.xml`. The site also includes
canonical metadata, Open Graph and Twitter metadata, JSON-LD, `robots.txt`,
`sitemap.xml`, and `manifest.webmanifest`.

### Configure PostHog when wanted

The site is fully functional without analytics. To opt in, create a PostHog
project and set all three variables in Vercel:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The included client initializes only at the exact canonical HTTPS origin. It
uses memory-only persistence, sends a root-only pageview through a strict
property filter, and disables cookies, broad autocapture, session replay, and
person profiles. Local development and preview domains remain silent. PostHog
still receives the request's IP address, so you own provider-side IP handling,
consent, retention, data governance, and ingestion verification.

## Direct

[`@hraness/direct`](https://github.com/hraness/direct) gives browser agents
named, repeatable UI states without putting fixtures in the production graph.
The separate Vite composition renders the real shared homepage through a
deterministic app-owned appearance port.

```sh
bun run dev:direct
```

The starter definition declares light, dark, and long-content fixture states.
The automated gate validates their worlds, activation, session manifest,
adapter lifecycle, and emitted boundaries; it does not drive a browser, so the
rendering claims remain `not-exercised` until an agent follows the included
`$direct-verify` workflow. Browser storage, operating-system theme changes,
Next.js hydration, PostHog, Vercel, DNS, and public delivery remain direct
evidence requirements.

`bun run check` builds Next.js and Direct independently. It scans a nonempty
production output for forbidden Direct markers, then positively checks that
the Direct output contains both the browser bridge and real shared UI.

## Knowledge base

[`@hraness/kb`](https://github.com/hraness/kb) treats Markdown and Git as the
authority. The starter vault uses an authored front door, which avoids a shared
generated catalog during parallel work.

Useful commands:

```sh
bun run kb:check:lane   # parallel lane, no shared catalog write
bun run kb:refresh      # integrating writer refreshes derived views
bun run kb:check        # vault and repository-context policy
bun run kb:catalog      # render the exhaustive catalog on demand
```

Exact search, metadata, links, graph analysis, and repository context work
locally. Semantic search is optional and downloads a local model on first use.
The included web and PDF capture skills use the installed KB CLI. The Reading
skill reviews selected captures and generates a network-silent public
projection. Browser, media, OCR, and platform-specific capabilities remain
optional and are reported honestly by `bun run kb:doctor`.

Repository visibility also controls KB visibility. A public generated
repository creates a public vault, so keep private notes in a private
repository or a separate private vault.

## Included skills

The repository ships focused workflows for:

- querying, planning, percolating, and refreshing the KB;
- cleaning dictated riffs into faithful first-person notes;
- capturing web pages and PDFs into auditable KB bundles;
- percolating reviewed captures and complete notes into the public Reading registry;
- adopting and verifying Direct while keeping it out of production;
- auditing disk use and removing only explicitly approved, clean, merged Git
  worktrees; and
- executing an accepted plan through bounded parallel lanes and join gates;
- auditing assumptions, comparing weighted decisions, reasoning from first
  principles, and reformulating stuck questions.

Each skill has its own `SKILL.md`. Agents should load the smallest applicable
workflow and follow the closest `AGENTS.md` before editing.

## Landing validated commits

For a trusted repository that permits direct pushes to `main`, the local
serializer replays explicit commits onto the newest `origin/main` in a detached
temporary worktree, installs the frozen graph, runs the full check, proves the
candidate stayed clean, and attempts an ordinary non-force push:

```sh
bun run merge:queue -- submit \
  --commit HEAD \
  --label "customize personal site"
```

If `main` moves before the push, the command rebuilds and revalidates the
candidate. Git's atomic ref update is the cross-machine serializer. No daemon,
database, force push, or provider credential is involved.

This command is intentionally smaller than a service-backed merge queue. It has no
status service, priority, crash-recovery database, affected-work planner, or
deployment verification. Branch protection that forbids direct pushes will
reject it. For teams and protected repositories, use pull requests and
GitHub's native merge queue instead.

## License

Template-authored files are available under the [MIT License](LICENSE).
[Third-party software](THIRD_PARTY.md) retains its own notices and licenses.
