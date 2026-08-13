# Contents

- `books.ts` and `books.test.ts` define the typed bookshelf registry, reading-state formatter, and data regressions.
- `page.tsx` renders the static `/bookshelf` route, metadata, semantic list, and structured data.

# Guidelines

- Keep the bookshelf file-based and provider-free. Add books to `books.ts`; never fetch metadata at runtime.
- Model books being read now separately from completed books. Current books require a `YYYY-MM` start date; completed books require a `YYYY-MM` read date. Every book requires its original publication year.
- Add only books the site owner has actually read or is reading. Preserve supplied titles, author names, dates, and notes.
- Keep the page typographic and quiet, with compact metadata and muted notes instead of cards, covers, ratings, or decorative taxonomy.
- Link each title to a reviewed first-party author or publisher source when one is available.
- Use the app-owned collection page header for the home breadcrumb and collection heading.
