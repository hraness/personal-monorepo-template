# Optional editorial images

Add editorial imagery only when it helps a reader understand or recognize an
article. The starter does not ship article banners, and an image quota is not
an SEO strategy.

Use the `editorial-image-seo` Codex skill when it is available. It covers
concept selection, generated-image safety, review, responsive delivery, and
production verification. The steps below remain the repository contract when
that skill is unavailable.

## Decide what to illustrate

- Give an indexable first-party article one representative banner only when the
  image has a clear editorial job and survives a small card crop.
- Add an interstitial only when it explains a process, comparison, sequence,
  place, or source artifact faster than prose. Do not add decorative
  interstitials for assumed search value.
- Use HTML, SVG, canvas, or a verified data chart for numbers, maps, timelines,
  product mechanics, and factual diagrams. Generated art can establish a mood
  or visual metaphor, but it must not invent evidence, labels, or interfaces.
- Keep essential information in text. A figure can clarify the article but
  cannot be the only place that states a fact or instruction.

## Make one typed record authoritative

Key a repository-owned image registry by the article's stable identifier. A
record can use this shape or an equivalent stricter type:

```ts
type RepresentativeImage = Readonly<{
  src: `/${string}`;
  socialSrc?: `/${string}`;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit?: string;
  contentType: "image/avif" | "image/jpeg" | "image/png" | "image/webp";
  byteLength: number;
  sha256: string;
  receipt?: string;
}>;
```

Use an exhaustive registry when every article in a collection must have a
banner. Use an explicit optional relationship when imagery is optional. Do not
maintain independent paths or captions in page components, metadata, feeds,
and sitemaps.

Keep the generation prompt, immutable job record or receipt, original file
hash, dimensions, and review result in repository-owned provenance. Do not
publish internal receipt paths or prompt text as page metadata.

## Project the record into the site

For each opted-in article, derive these surfaces from the same record:

- Render the banner as a visible semantic `<figure>` near the article opening.
  Use an actual image element, intrinsic `width` and `height`, and an accurate
  responsive `sizes` value. Do not hide the representative image in a CSS
  background.
- Write literal alt text for what is visible. Put useful context and disclosure
  in `<figcaption>`, including a concise credit when one is required. A linked
  card thumbnail can use empty alt text when its adjacent linked title already
  names the destination.
- Use `socialSrc` when an exact social crop exists; otherwise use `src` for Open
  Graph and Twitter metadata. Keep the canonical article URL beside that
  metadata.
- Add the same visible representative image to the article's honest
  `Article`, `BlogPosting`, or `NewsArticle` JSON-LD. Include dimensions and a
  caption when the schema helper supports an `ImageObject`.
- When a feed exists, add an absolute Atom enclosure or RSS enclosure/media
  element with the registry's media type and byte length.
- Attach the image URL to the canonical article URL in the image sitemap. Do
  not create a separate sitemap page for the binary.

Add deterministic tests that prove every public projection resolves to the
same typed record. A new image path should fail validation when the file is
missing, its intrinsic dimensions or content type differ, or its SHA-256 no
longer matches.

## Protect page performance

- Load a primary above-the-fold banner eagerly only when measurement or page
  structure makes it the likely Largest Contentful Paint candidate.
- Lazy-load card thumbnails and below-the-fold figures.
- Keep one reviewed master and let the framework image pipeline create
  responsive derivatives. Make a deterministic social crop only when the
  design needs a distinct aspect ratio. Never stretch the master.
- Size homepage image modules deliberately. Do not load every article banner on
  the homepage when a smaller curated set serves the reader.

## Review and verify

Before publication:

1. Review the full-size image and a small thumbnail for legibility, crop safety,
   accidental text, visual errors, trademarks, and unsupported claims.
2. Inspect the article and its card or collection view at desktop and mobile
   widths. Confirm the banner does not bury the headline or direct answer.
3. Inspect canonical, Open Graph, Twitter, JSON-LD, feed, and sitemap output.
   Confirm each absolute URL points to the same reviewed asset or its declared
   social crop.
4. Run the repository's complete check and build.
5. After deployment, fetch one representative article, its image, the feed,
   and the sitemap from the canonical origin. Confirm media types, dimensions,
   and article-to-image association.

Treat image discovery and performance as measurable behavior. Do not promise a
ranking improvement from adding images.
