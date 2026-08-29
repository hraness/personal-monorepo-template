# Contents

- `json-ld.tsx` safely serializes and renders structured data.
- `seo.test.ts` covers script escaping and static discovery routes.

# Guidelines

- Keep canonical metadata, robots, sitemap, manifest, feed discovery, Open Graph, Twitter cards, and JSON-LD statically derived from repository-owned data.
- Escape every JSON-LD value for an inline script context. Do not interpolate foreign strings into raw markup.
- Keep structured data honest about authorship and source type. Do not invent dates, images, social handles, ratings, or publication state.
- When an article has an opt-in representative image, derive Open Graph, Twitter, `Article`-family JSON-LD, and its image sitemap entry from the same typed record. Test that each projection stays attached to the canonical article URL.
- Do not add SEO providers, runtime metadata fetches, keyword stuffing, hidden text, or duplicate content routes.
