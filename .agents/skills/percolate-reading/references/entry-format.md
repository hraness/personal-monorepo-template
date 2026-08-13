# Reading entry format

Store one maintained note at `kb/notes/reading/<slug>.md`. The filename and `reading.slug` must match. Every note uses a common reviewed source envelope and exactly one of two forms.

## Digest

Use a digest for a captured public web article. A published digest must resolve one web capture Markdown file and its adjacent `capture.json`; a draft may temporarily reference a legacy capture without a manifest, but all other validation still applies.

```md
---
title: "A useful source title"
type: note
tags:
  - reading
reading:
  status: draft
  form: digest
  slug: a-useful-source-title
  source_url: "https://example.com/useful-source"
  reviewed: "2026-08-03"
  authors:
    - name: "Ada Example"
      url: "https://example.com/about"
      kind: person
  publication:
    name: "Example Review"
    url: "https://example.com/"
  published: "2026-07-31"
relations:
  synthesizes:
    - articles/a-useful-source-title/a-useful-source-title
---
# A useful source title

## Gist

Write one plain paragraph of 35 to 100 words that states the source's central contribution, the mechanism or evidence behind it, and why the result is useful. Favor decision-relevant understanding over a tour through the article's sections.

## Ideas

- **Name the governing claim.** Explain its useful consequence or supporting mechanism on the same line.
- **Preserve a meaningful constraint.** State when the claim stops applying or what evidence limits it.
- **Make the idea usable.** Translate the source's insight into a concrete lens, choice, or action.

## Quotes

> A short passage copied exactly from the captured body.
>
> Attribution: Ada Example, stating the governing claim.

> Another distinct passage whose exact language earns the space.
>
> Attribution: Grace Example, explaining the result.

## Source

[[articles/a-useful-source-title/a-useful-source-title|captured source]]
```

Keep sections in the shown order. `## Quotes` is optional.

- Match the H1 to the frontmatter title exactly.
- Keep `## Gist` to one plain 35–100-word paragraph.
- Write three to five single-line idea bullets as `- **Short claim.** Detail`.
- Include one to four quote groups. For substantive sources with several useful passages, prefer two to four. Separate groups by one blank line.
- Each quote group contains exactly the quote, an empty `>` line, and `> Attribution: ...`.
- Each quote must occur verbatim in a distinct, non-overlapping passage of the rendered capture text after whitespace normalization, contain no surrounding quotation marks, and contain at most 25 words. Consecutive timestamped transcript captions are matched as continuous spoken text after their timestamp and speaker scaffolding is removed. Quotes must be unique and total at most 100 words.
- Put exactly `[[capture-id|captured source]]` under `## Source`, using the same capture ID as the `synthesizes` relation.

## Complete note

Use a complete note when the saved passage or dated note itself is the public object. This form can be percolated later from an ordinary KB quote note. Its evidence may be any confined KB note ID, but that private path never appears in the generated public entry.

```md
---
title: "A dated passage"
type: note
tags:
  - reading
reading:
  status: draft
  form: note
  slug: a-dated-passage
  source_kind: book
  source_url: "https://archive.example.com/book/page/76"
  source_title: "A Book Worth Returning To"
  saved: "2025-05"
  reviewed: "2026-08-03"
  summary: "a complete passage from Ada Example on tools and attention."
  full_text_reviewed: true
  evidence_locator: "saved quote, paragraph 3"
  republication_basis: permission
  authors:
    - name: "Ada Example"
      kind: person
  publication:
    name: "Example Press"
    url: "https://example.com/"
  published: "1986"
relations:
  evidenced-by:
    - notes/quotes/a-dated-passage
---
# A dated passage

## Note

> Preserve the complete reviewed passage here. It may contain *emphasis*, **strong text**, and a hard\
> line break.
>
> Keep each original paragraph as another paragraph in the same block quotation.

## Source

[Ada Example, *A Book Worth Returning To* (Example Press, 1986), 76.](https://archive.example.com/book/page/76)
```

- Match the H1 to the frontmatter title exactly.
- Put the content under `## Note` as exactly one Markdown blockquote with one to 40 paragraphs and at most 1,000 words.
- The reviewed inline subset is plain text, emphasis, strong text, and hard breaks. Raw HTML, images, code, lists, nested quotations, and arbitrary links are rejected.
- Put one Markdown link under `## Source`. Its URL must exactly match `reading.source_url`. Its label may contain plain text and emphasis.
- `saved` accepts `YYYY-MM` or `YYYY-MM-DD` and must not be later than `reviewed`. `published` accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. `reviewed` always uses `YYYY-MM-DD`.
- Set `source_kind` to `article` or `book` and provide reviewed source title, author, publication, and public URL metadata.
- Give a precise, private `evidence_locator`. The projector requires the normalized complete-note text to occur in the evidence note. If imperfect OCR or equivalent transcription noise prevents that comparison, manually reconcile the selected passage and add `evidence_text_reviewed: true`; omit the flag when automatic matching succeeds.
- A published complete note requires `full_text_reviewed: true` and `republication_basis`. Allowed bases are `short-quotation`, `public-domain`, `licensed`, `permission`, and `existing-publication-reviewed`. `short-quotation` is limited to 25 words. Use `existing-publication-reviewed` only when moving content already published on the same site at its owner's direction. Confirm transcription, formatting, privacy, source accuracy, and the republication boundary. These fields record editorial review and do not create publication rights.
- Private or PDF evidence is permitted only for complete-note provenance when the selected passage has an independently reviewed public source, evidence locator, transcription review, and republication basis. It remains in the vault and is never projected.
- Declare exactly one `evidenced-by` target using a confined KB note ID without `.md`. Do not add a reciprocal relation merely for publication.

## Common frontmatter and projection

- Keep only `title`, `type`, `tags`, `reading`, and `relations` at the top level. `type` must be `note`; `tags` must include `reading`.
- Keep public prose free of vault-link syntax and invisible or control characters. The projector rejects these even when Markdown formatting splits them across inline nodes.
- Use a kebab-case slug and a clean HTTPS `source_url` without known tracking parameters.
- Keep source URLs and provenance relations unique across the Reading collection. One public source or evidence note currently maps to one maintained Reading entry.
- Supply one or more authors as `{name, url?, kind?}` and one publication as `{name, url}`. Use `kind: organization` for a company, publication staff, or collective; omit `kind` or use `person` for a person.
- Digest `reviewed` records editorial review. Digest `published` is optional exact-day source metadata. When a capture preserves only a publication month, leave it unset instead of inventing a day.
- Add digest-only `partial_reviewed: true` after inspecting a partial capture boundary. Omit it for complete captures.
- Add digest-only `author_metadata_reviewed: true` after deliberately resolving incomplete or misleading extracted author metadata. Do not use it to bypass an unresolved discrepancy.

The generated public entry contains only the slug, title, review and saved dates, reviewed public source metadata, and its discriminated content. Digest content contains `gist`, `ideas`, and `quotes`. Complete-note content contains `summary`, safe rich paragraphs, and the public citation. Neither form projects vault paths, evidence IDs, capture acquisition metadata, or review-only flags.
