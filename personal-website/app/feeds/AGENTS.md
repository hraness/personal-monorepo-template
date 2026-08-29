# Contents

- `atom.ts` is the small Atom 1.0 serializer and date-normalization boundary.
- `paths.ts` owns the canonical Reading and Atom paths.
- `atom.test.ts` covers empty feeds, XML escaping, dates, and URL validation.

# Guidelines

- Emit Atom 1.0 only. Mark titles, subtitles, and summaries as text constructs, and escape every foreign value before placing it in XML.
- Use stable absolute URLs for feed and entry IDs. Preserve publication and update dates and represent the external source with Atom `via`.
- When an article opts into a representative image, derive its absolute enclosure URL and media type from the same typed record as the visible figure and discovery metadata.
- Keep feed generation deterministic, local, network-silent, and statically renderable.
- Support an empty starter feed with an explicit deterministic update date; do not fabricate an entry.
