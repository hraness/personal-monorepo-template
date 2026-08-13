# Contents

- Each lowercase Markdown file is the private maintained source for one reviewed public Reading entry.
- An entry is either a digest of a captured public article or a complete note backed by a confined KB evidence note.

# Guidelines

- Keep evidence immutable. A digest links one web capture with `synthesizes`; a complete note links one evidence note with `evidenced-by` and includes a reviewed public citation.
- Treat `reading.status: published` as explicit public approval. Drafts stay out of the generated website projection.
- Preserve source titles, authors, speakers, dates, proper nouns, and necessary uncertainty. Distinguish the source author's claim, a quoted speaker's claim, and the maintained synthesis.
- In a digest, write one compact gist, three to five useful ideas, and up to four distinct verbatim quotations from non-overlapping source passages. Keep each quotation at 25 words or fewer and the total at 100 words or fewer.
- Verify every digest quotation against the capture and attribute its actual speaker and context.
- Use a complete note only when the reviewed passage itself is the public object. Record its evidence locator, transcription review, and republication basis.
- Never project capture assets, evidence paths, private provenance, signed-in material, or unrelated source text.
- Use clean canonical HTTPS source URLs. Reject partial or access-dependent captures unless the skill's explicit reviewed exception applies.
- Regenerate `personal-website/app/reading/entries.generated.ts` with `bun run reading:generate`; never edit the projection directly.
