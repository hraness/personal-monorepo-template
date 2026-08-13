# Contents

- Web captures live in one descriptive directory per capture with Markdown, `capture.json`, optional tool-owned `url-metadata.json`, inert evidence, and local `assets/`.
- PDF captures keep the original document, page-provenance text, image metadata, OCR evidence, and visual assets together in their capture directory.

# Guidelines

- Use `$save-url-kb` or `$save-pdf-kb` so source metadata, relative links, images, and provenance are handled consistently.
- Keep each capture self-contained and record its original source, capture date, completeness, expected-versus-captured counts, and warnings in `capture.json`.
- Keep search-derived candidates and provider attempts in tool-owned `url-metadata.json`; do not merge them into provenance or edit the sidecar by hand.
- Keep local assets beside their capture and use relative links from the capture Markdown.
- Do not commit cookies, credentials, browser profiles, raw authenticated DOM, HAR files, or other session state. A sanitizer does not make screenshots or authenticated prose safe to publish.
- Preserve captured wording and source authority. Put personal analysis in a separate linked note or a clearly labeled annotation.
- Never present a partial capture as complete or change a capture's completeness by hand.
