# Contents

- `entries.ts` and `entries.generated.ts` define the public reading contract, generated KB projection, lookup helpers, and newest-first registry.
- `page.tsx` and `[slug]/page.tsx` provide the static Reading collection and entry permalinks.
- `entry-content.tsx` renders semantic source metadata, digests, quotations, and complete notes.
- `feed.ts` and `atom.xml/route.ts` provide the static reading-notes Atom document.
- Colocated tests cover the empty starter, dates, feed behavior, and public boundary.

# Guidelines

- Generate every public entry from `entries.generated.ts`. Production code must never read `kb/` or fetch a source at runtime.
- Treat `entries.generated.ts` as a deterministic public projection owned by `$percolate-reading`; regenerate it instead of editing it by hand.
- Keep `/reading/atom.xml` derived from the same registry. Use the internal permalink as the entry URL and Atom `via` for the external source.
- Publish only reviewed public fields. Never project vault paths, capture manifests, local assets, acquisition details, or private provenance.
- Keep digest and complete-note content as a discriminated union and render primary content in server HTML.
- Model the external source as an Article or Book in structured data. The site owner remains the author of the reading note.
- Keep the surface chronological, typographic, and quiet. Do not add cards, tags, reactions, subscriptions, reading-time badges, or decorative media.
- Use the app-owned collection page header for the home breadcrumb and collection heading.
