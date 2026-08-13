import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  expectedReadingModule,
  generatedReadingPath,
  readingEntries,
  readingInbox,
  renderReadingEntries,
  syncReading,
} from "./reading";
import { parseReadingCommand, runReadingCommand } from "./sync-reading";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "percolate-reading-test-"));
  temporaryRoots.push(root);
  return root;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

type CaptureOptions = {
  readonly title?: string;
  readonly sourceUrl?: string;
  readonly clipped?: string;
  readonly capturedAt?: string;
  readonly status?: string;
  readonly scope?: string;
  readonly method?: string;
  readonly author?: string | null;
  readonly published?: string;
  readonly body?: string;
  readonly manifest?: boolean;
  readonly warningCount?: number;
};

function capture(root: string, slug: string, options: CaptureOptions = {}): string {
  const title = options.title ?? `Source ${slug}`;
  const sourceUrl = options.sourceUrl ?? `https://example.com/${slug}`;
  const clipped = options.clipped ?? "2026-08-01";
  const capturedAt = options.capturedAt ?? `${clipped}T12:34:56.000Z`;
  const status = options.status ?? "complete";
  const scope = options.scope ?? "page";
  const method = options.method ?? "http";
  const author = options.author === undefined ? "Ada Example" : options.author;
  const published = options.published ?? "2026-07-31T08:00:00.000Z";
  const body = options.body ?? "Durable tools become more useful when their boundaries are clear.";
  const directory = join(root, "kb/articles", slug);
  write(join(directory, `${slug}.md`), [
    "---",
    `title: ${JSON.stringify(title)}`,
    `source: ${JSON.stringify(sourceUrl)}`,
    ...(author === null ? [] : [`author: ${JSON.stringify(author)}`]),
    `published: ${JSON.stringify(published)}`,
    `clipped: ${JSON.stringify(clipped)}`,
    `capture_status: ${JSON.stringify(status)}`,
    `capture_method: ${JSON.stringify(method)}`,
    `capture_scope: ${JSON.stringify(scope)}`,
    "---",
    `# ${title}`,
    "",
    body,
    "",
  ].join("\n"));
  if (options.manifest !== false) {
    write(join(directory, "capture.json"), `${JSON.stringify({
      schemaVersion: 3,
      sourceUrl,
      canonicalUrl: sourceUrl,
      capturedAt,
      platform: "generic",
      status,
      scope,
      acquisition: { method, finalUrl: sourceUrl, contentType: "text/html" },
      warnings: Array.from({ length: options.warningCount ?? 0 }, (_, index) => `warning ${index + 1}`),
    }, null, 2)}\n`);
  }
  return `articles/${slug}/${slug}`;
}

const defaultGist = "This article argues that durable tools become more valuable when people can combine them into focused products. It explains the mechanism through documented interfaces, fast feedback, and repeated field use, then identifies the practical tradeoffs. The result is a useful lens for deciding which components deserve investment and which product boundaries should remain narrow.";

type NoteOptions = {
  readonly title?: string;
  readonly status?: "draft" | "published";
  readonly sourceUrl?: string;
  readonly captureId?: string;
  readonly authors?: readonly string[];
  readonly authorKinds?: Readonly<Record<string, "organization" | "person">>;
  readonly published?: string | null;
  readonly reviewed?: string;
  readonly gist?: string;
  readonly quotes?: readonly Readonly<{ text: string; attribution?: string }>[];
  readonly partialReviewed?: boolean;
  readonly authorMetadataReviewed?: boolean;
};

function note(root: string, slug: string, options: NoteOptions = {}): string {
  const title = options.title ?? `Reading ${slug}`;
  const status = options.status ?? "published";
  const sourceUrl = options.sourceUrl ?? `https://example.com/${slug}`;
  const related = options.captureId ?? `articles/${slug}/${slug}`;
  const authors = options.authors ?? ["Ada Example"];
  const published = options.published === undefined ? "2026-07-31" : options.published;
  const quoteSection = options.quotes === undefined ? [] : [
    "",
    "## Quotes",
    "",
    ...options.quotes.flatMap((quote, index) => [
      `> ${quote.text}`,
      ">",
      `> Attribution: ${quote.attribution ?? authors[0] ?? "Source author"}`,
      ...(index === options.quotes!.length - 1 ? [] : [""]),
    ]),
  ];
  const path = join(root, "kb/notes/reading", `${slug}.md`);
  write(path, [
    "---",
    `title: ${JSON.stringify(title)}`,
    "type: note",
    "tags:",
    "  - reading",
    "reading:",
    `  status: ${status}`,
    "  form: digest",
    `  slug: ${slug}`,
    `  source_url: ${JSON.stringify(sourceUrl)}`,
    `  reviewed: ${JSON.stringify(options.reviewed ?? "2026-08-03")}`,
    "  authors:",
    ...authors.flatMap((author) => [
      `    - name: ${JSON.stringify(author)}`,
      ...(options.authorKinds?.[author] === undefined
        ? []
        : [`      kind: ${options.authorKinds[author]}`]),
    ]),
    "  publication:",
    "    name: Example Review",
    "    url: https://example.com",
    ...(published === null ? [] : [`  published: ${JSON.stringify(published)}`]),
    ...(options.partialReviewed === true ? ["  partial_reviewed: true"] : []),
    ...(options.authorMetadataReviewed === true ? ["  author_metadata_reviewed: true"] : []),
    "relations:",
    "  synthesizes:",
    `    - ${related}`,
    "---",
    `# ${title}`,
    "",
    "## Gist",
    "",
    options.gist ?? defaultGist,
    "",
    "## Ideas",
    "",
    "- **Boundaries create leverage.** Clear interfaces let people reuse a component without reconstructing all of its internal decisions.",
    "- **Evidence should travel.** Local provenance lets a reviewer distinguish a supported claim from a plausible editorial inference.",
    "- **Constraints improve selection.** A narrow public format keeps the durable ideas while leaving private capture mechanics behind.",
    ...quoteSection,
    "",
    "## Source",
    "",
    `[[${related}|captured source]]`,
    "",
  ].join("\n"));
  return path;
}

type FullNoteOptions = {
  readonly status?: "draft" | "published";
  readonly fullTextReviewed?: boolean;
  readonly evidenceId?: string;
  readonly evidenceText?: string;
  readonly evidenceTextReviewed?: boolean;
  readonly republicationBasis?: string | null;
  readonly body?: string;
  readonly sourceUrl?: string;
  readonly saved?: string;
  readonly reviewed?: string;
};

function fullNote(root: string, slug: string, options: FullNoteOptions = {}): string {
  const evidenceId = options.evidenceId ?? `notes/quotes/${slug}-evidence`;
  const sourceUrl = options.sourceUrl ?? `https://archive.org/details/${slug}`;
  const body = options.body ?? [
    "> This is a *complete passage* with reviewed formatting.",
    ">",
    "> **It can’t be *taught.***  ",
    "> **It can only be *caught.***",
  ].join("\n");
  write(join(root, "kb", `${evidenceId}.md`), `${options.evidenceText ?? body}\n`);
  const path = join(root, "kb/notes/reading", `${slug}.md`);
  write(path, [
    "---",
    `title: ${JSON.stringify(`Reading ${slug}`)}`,
    "type: note",
    "tags:",
    "  - reading",
    "reading:",
    `  status: ${options.status ?? "published"}`,
    "  form: note",
    `  slug: ${slug}`,
    "  source_kind: book",
    `  source_url: ${JSON.stringify(sourceUrl)}`,
    `  source_title: ${JSON.stringify(`Source ${slug}`)}`,
    `  saved: ${JSON.stringify(options.saved ?? "2025-05")}`,
    `  reviewed: ${JSON.stringify(options.reviewed ?? "2026-08-03")}`,
    '  summary: "A complete short passage preserved as a dated reading note."',
    ...(options.fullTextReviewed === false ? [] : ["  full_text_reviewed: true"]),
    `  evidence_locator: ${JSON.stringify("saved passage")}`,
    ...(options.evidenceTextReviewed === true ? ["  evidence_text_reviewed: true"] : []),
    ...(options.republicationBasis === null
      ? []
      : [`  republication_basis: ${options.republicationBasis ?? "existing-publication-reviewed"}`]),
    "  authors:",
    "    - name: Michael Example",
    "  publication:",
    "    name: Example Press",
    "    url: https://example.com",
    '  published: "1986"',
    "relations:",
    "  evidenced-by:",
    `    - ${evidenceId}`,
    "---",
    `# Reading ${slug}`,
    "",
    "## Note",
    "",
    body,
    "",
    "## Source",
    "",
    `[Michael Example, *Source ${slug}* (Example Press, 1986), 76.](${sourceUrl})`,
    "",
  ].join("\n"));
  return path;
}

describe("reading projection", () => {
  test("preserves month-only capture provenance without inventing a public publication day", () => {
    const root = fixtureRoot();
    capture(root, "month-only", { published: "2026-08" });
    note(root, "month-only", { published: null });

    expect(readingEntries(root)[0]?.source.publishedAt).toBeUndefined();

    note(root, "month-only", { published: "2026-08-31" });
    expect(() => readingEntries(root)).toThrow(
      "reading.published cannot supply an exact day when capture published metadata has only month precision",
    );

    const invalidRoot = fixtureRoot();
    capture(invalidRoot, "invalid-month", { published: "2026-13" });
    note(invalidRoot, "invalid-month", { published: null });
    expect(() => readingEntries(invalidRoot)).toThrow("must contain a real calendar month");
  });

  test("normalizes space-separated capture publication timestamps", () => {
    const root = fixtureRoot();
    capture(root, "space-separated-published", { published: "2026-08-10 06:30:02" });
    note(root, "space-separated-published", { published: "2026-08-10" });

    expect(readingEntries(root)[0]?.source.publishedAt).toBe("2026-08-10");

    const invalidRoot = fixtureRoot();
    capture(invalidRoot, "invalid-space-separated-published", { published: "2026-08-10 99:00:00" });
    note(invalidRoot, "invalid-space-separated-published", { published: "2026-08-10" });
    expect(() => readingEntries(invalidRoot)).toThrow("must be an ISO-compatible timestamp");
  });

  test("reconciles equivalent duplicate capture publication timestamps", () => {
    const root = fixtureRoot();
    capture(root, "duplicate-published", {
      published: "2026-08-06T13:10:48+00:00, 2026-08-06T13:10:48Z",
    });
    note(root, "duplicate-published", { published: "2026-08-06" });

    expect(readingEntries(root)[0]?.source.publishedAt).toBe("2026-08-06");

    const conflictingRoot = fixtureRoot();
    capture(conflictingRoot, "conflicting-published", {
      published: "2026-08-06T13:10:48Z, 2026-08-07T13:10:48Z",
    });
    note(conflictingRoot, "conflicting-published", { published: "2026-08-06" });
    expect(() => readingEntries(conflictingRoot)).toThrow(
      "duplicate timestamps must resolve to the same calendar date",
    );
  });

  test("projects only published notes in canonical saved-date and slug order", () => {
    const root = fixtureRoot();
    capture(root, "z-later", {
      title: "Canonical source title",
      clipped: "2026-08-03",
      capturedAt: "2026-08-03T23:59:00.000Z",
      sourceUrl: "https://letters.example.com/p/useful?r=reader&triedRedirect=true&utm_source=mail",
      body: "A short line survives whitespace changes and remains exact.",
    });
    note(root, "z-later", {
      title: "Editorial reading title",
      sourceUrl: "https://letters.example.com/p/useful",
      quotes: [{ text: "A short line survives whitespace changes and remains exact." }],
      authorKinds: { "Ada Example": "organization" },
    });
    capture(root, "a-same-day", { clipped: "2026-08-03" });
    note(root, "a-same-day");
    capture(root, "older", { clipped: "2026-08-02" });
    note(root, "older");
    capture(root, "draft", { clipped: "2026-08-04", manifest: false });
    note(root, "draft", { status: "draft" });

    const entries = readingEntries(root);
    expect(entries.map(({ slug }) => slug)).toEqual(["a-same-day", "z-later", "older"]);
    expect(entries[1]).toMatchObject({
      title: "Editorial reading title",
      reviewedAt: "2026-08-03",
      savedAt: "2026-08-03",
      source: {
        authors: [{ kind: "organization", name: "Ada Example" }],
        title: "Canonical source title",
        url: "https://letters.example.com/p/useful",
        publishedAt: "2026-07-31",
      },
      content: {
        kind: "digest",
        quotes: [{ text: "A short line survives whitespace changes and remains exact." }],
      },
    });
    const generated = renderReadingEntries(entries);
    expect(generated).toStartWith('import type { ReadingEntry } from "./entries";\n\n');
    expect(generated).toContain("export const generatedReadingEntries = [");
    expect(generated).toEndWith(" satisfies readonly ReadingEntry[];\n");
    expect(generated).not.toContain("articles/z-later");
    expect(generated).not.toContain("kb/");
  });

  test("validates drafts even though it excludes them from public output", () => {
    const root = fixtureRoot();
    capture(root, "draft", { manifest: false });
    note(root, "draft", { status: "draft", gist: "Too short." });
    expect(() => readingEntries(root)).toThrow("Gist: must contain 35 through 100 words");
  });

  test("requires a manifest for publication and exact captured-at day provenance", () => {
    const missing = fixtureRoot();
    capture(missing, "legacy", { manifest: false });
    note(missing, "legacy");
    expect(() => readingEntries(missing)).toThrow("published reading notes require an adjacent capture.json");

    const mismatched = fixtureRoot();
    capture(mismatched, "mismatch", {
      clipped: "2026-08-01",
      capturedAt: "2026-08-02T00:00:00.000Z",
    });
    note(mismatched, "mismatch");
    expect(() => readingEntries(mismatched)).toThrow("manifest day does not match Markdown clipped date");
  });

  test("requires deliberate review for partial captures and rejects private publication routes", () => {
    const partial = fixtureRoot();
    capture(partial, "partial", { status: "partial", scope: "thread" });
    note(partial, "partial");
    expect(() => readingEntries(partial)).toThrow("partial captures require `partial_reviewed: true`");
    note(partial, "partial", { partialReviewed: true });
    expect(readingEntries(partial)).toHaveLength(1);

    const privateRoot = fixtureRoot();
    capture(privateRoot, "private", { method: "browser-profile" });
    note(privateRoot, "private");
    expect(() => readingEntries(privateRoot)).toThrow("cannot use private acquisition method browser-profile");
    note(privateRoot, "private", { status: "draft" });
    expect(readingEntries(privateRoot)).toEqual([]);
  });

  test("reconciles extracted authors unless an explicit metadata review is recorded", () => {
    const root = fixtureRoot();
    capture(root, "authored", { author: "Ada Example; Grace Example" });
    note(root, "authored", { authors: ["Ada Example", "Linus Example"] });
    expect(() => readingEntries(root)).toThrow("reading authors do not match capture author metadata");
    note(root, "authored", {
      authors: ["Ada Example", "Linus Example"],
      authorMetadataReviewed: true,
    });
    expect(readingEntries(root)[0]?.source.authors.map(({ name }) => name)).toEqual([
      "Ada Example",
      "Linus Example",
    ]);

    const missing = fixtureRoot();
    capture(missing, "missing-author", { author: null });
    note(missing, "missing-author");
    expect(() => readingEntries(missing)).toThrow("capture has no author metadata");
    note(missing, "missing-author", { authorMetadataReviewed: true });
    expect(readingEntries(missing)).toHaveLength(1);
  });

  test("verifies multiple short quotes literally after whitespace normalization", () => {
    const missing = fixtureRoot();
    capture(missing, "quote", { body: "The captured sentence uses different words." });
    note(missing, "quote", { quotes: [{ text: "A sentence that was never captured." }] });
    expect(() => readingEntries(missing)).toThrow("does not occur verbatim");

    const long = fixtureRoot();
    const longQuote = Array.from({ length: 26 }, (_, index) => `word${index + 1}`).join(" ");
    capture(long, "long", { body: longQuote });
    note(long, "long", { quotes: [{ text: longQuote }] });
    expect(() => readingEntries(long)).toThrow("must contain at most 25 words");

    const quoted = fixtureRoot();
    capture(quoted, "surrounded", { body: 'A useful exact sentence.' });
    note(quoted, "surrounded", { quotes: [{ text: '“A useful exact sentence.”' }] });
    expect(() => readingEntries(quoted)).toThrow("must not include surrounding quotation marks");

    const whitespace = fixtureRoot();
    capture(whitespace, "whitespace", { body: "A useful exact\nquote remains locally verifiable." });
    note(whitespace, "whitespace", { quotes: [
      { text: "A useful exact quote remains locally verifiable." },
      { text: "A second exact sentence stays useful." },
    ] });
    capture(whitespace, "whitespace", {
      body: "A useful exact\nquote remains locally verifiable. A second exact sentence stays useful.",
    });
    expect(readingEntries(whitespace)[0]?.content).toMatchObject({
      kind: "digest",
      quotes: [
        { text: "A useful exact quote remains locally verifiable." },
        { text: "A second exact sentence stays useful." },
      ],
    });

    const timestampedTranscript = fixtureRoot();
    capture(timestampedTranscript, "timestamped-transcript", {
      body: [
        "## Transcript",
        "",
        "- [03:28] A winning thesis can",
        "- [03:30] still fail under leverage.",
      ].join("\n"),
    });
    note(timestampedTranscript, "timestamped-transcript", { quotes: [
      { text: "A winning thesis can still fail under leverage." },
    ] });
    expect(readingEntries(timestampedTranscript)[0]?.content).toMatchObject({
      kind: "digest",
      quotes: [{ text: "A winning thesis can still fail under leverage." }],
    });

    const transcriptSpeakerChange = fixtureRoot();
    capture(transcriptSpeakerChange, "transcript-speaker-change", {
      body: [
        "## Transcript",
        "",
        "- [03:28] One speaker makes a claim.",
        "- [03:30] &gt;&gt; Another speaker supplies the answer.",
      ].join("\n"),
    });
    note(transcriptSpeakerChange, "transcript-speaker-change", { quotes: [
      { text: "One speaker makes a claim. Another speaker supplies the answer." },
    ] });
    expect(() => readingEntries(transcriptSpeakerChange)).toThrow("does not occur verbatim");

    const fencedTranscriptHeading = fixtureRoot();
    capture(fencedTranscriptHeading, "fenced-transcript-heading", {
      body: [
        "```text",
        "## Transcript",
        "- [03:28] A timestamped code sample",
        "- [03:30] is not a transcript section.",
        "```",
      ].join("\n"),
    });
    note(fencedTranscriptHeading, "fenced-transcript-heading", { quotes: [
      { text: "A timestamped code sample is not a transcript section." },
    ] });
    expect(() => readingEntries(fencedTranscriptHeading)).toThrow("does not occur verbatim");

    const duplicate = fixtureRoot();
    capture(duplicate, "duplicate-quote", { body: "A useful exact sentence." });
    note(duplicate, "duplicate-quote", { quotes: [
      { text: "A useful exact sentence." },
      { text: "A useful exact sentence." },
    ] });
    expect(() => readingEntries(duplicate)).toThrow("must not repeat quote text");

    const renderedMarkdown = fixtureRoot();
    capture(renderedMarkdown, "rendered-markdown", {
      body: "That is *great*, actually. A &amp; B remain visible.",
    });
    note(renderedMarkdown, "rendered-markdown", { quotes: [
      { text: "That is great, actually." },
      { text: "A & B remain visible." },
    ] });
    expect(readingEntries(renderedMarkdown)).toHaveLength(1);

    const hiddenHtml = fixtureRoot();
    capture(hiddenHtml, "hidden-html", { body: "<!-- The CEO resigned. -->" });
    note(hiddenHtml, "hidden-html", { quotes: [{ text: "The CEO resigned." }] });
    expect(() => readingEntries(hiddenHtml)).toThrow("does not occur verbatim");

    const overlapping = fixtureRoot();
    capture(overlapping, "overlapping", { body: "A useful exact sentence." });
    note(overlapping, "overlapping", { quotes: [
      { text: "A useful exact sentence." },
      { text: "A useful exact sentence" },
    ] });
    expect(() => readingEntries(overlapping)).toThrow("distinct, non-overlapping passages");

    const orderIndependent = fixtureRoot();
    capture(orderIndependent, "order-independent", {
      body: "The rule is simple. The rule returns.",
    });
    note(orderIndependent, "order-independent", { quotes: [
      { text: "The rule" },
      { text: "The rule is simple." },
    ] });
    expect(readingEntries(orderIndependent)).toHaveLength(1);

    const boundedOverlap = fixtureRoot();
    capture(boundedOverlap, "bounded-overlap", { body: "a".repeat(1_000) });
    note(boundedOverlap, "bounded-overlap", { quotes: [251, 252, 253, 254].map((length) => ({
      text: "a".repeat(length),
    })) });
    expect(() => readingEntries(boundedOverlap)).toThrow("distinct, non-overlapping passages");

    const omittedBarrier = fixtureRoot();
    capture(omittedBarrier, "omitted-barrier", {
      body: "Alpha\n\n<div>intervening words</div>\n\nBeta",
    });
    note(omittedBarrier, "omitted-barrier", { quotes: [{ text: "Alpha Beta" }] });
    expect(() => readingEntries(omittedBarrier)).toThrow("does not occur verbatim");

    const cjkLimit = fixtureRoot();
    const cjkQuote = "词".repeat(26);
    capture(cjkLimit, "cjk-limit", { body: cjkQuote });
    note(cjkLimit, "cjk-limit", { quotes: [{ text: cjkQuote }] });
    expect(() => readingEntries(cjkLimit)).toThrow("must contain at most 25 words");

    const invisibleSeparator = fixtureRoot();
    const separated = "alpha\u200Bbeta";
    capture(invisibleSeparator, "invisible-separator", { body: separated });
    note(invisibleSeparator, "invisible-separator", { quotes: [{ text: separated }] });
    expect(() => readingEntries(invisibleSeparator)).toThrow(
      "must not contain control or invisible formatting characters",
    );
  });

  test("projects a reviewed dated full note without leaking its private evidence relation", () => {
    const root = fixtureRoot();
    fullNote(root, "whole-passage");
    const entry = readingEntries(root)[0];
    expect(entry).toMatchObject({
      slug: "whole-passage",
      savedAt: "2025-05",
      source: { kind: "book", publishedAt: "1986" },
      content: {
        kind: "note",
        summary: "A complete short passage preserved as a dated reading note.",
      },
    });
    expect(entry?.content.kind === "note" ? entry.content.paragraphs : []).toHaveLength(2);
    const generated = renderReadingEntries(entry === undefined ? [] : [entry]);
    expect(generated).not.toContain("whole-passage-evidence");
    expect(generated).not.toContain("kb/");

    const unreviewed = fixtureRoot();
    fullNote(unreviewed, "unreviewed", { fullTextReviewed: false });
    expect(() => readingEntries(unreviewed)).toThrow("requires `full_text_reviewed: true`");

    const missingBasis = fixtureRoot();
    fullNote(missingBasis, "missing-basis", { republicationBasis: null });
    expect(() => readingEntries(missingBasis)).toThrow("requires a reviewed `republication_basis`");

    const mismatchedEvidence = fixtureRoot();
    fullNote(mismatchedEvidence, "mismatched-evidence", { evidenceText: "An unrelated saved note." });
    expect(() => readingEntries(mismatchedEvidence)).toThrow("does not occur in the evidence note");
    fullNote(mismatchedEvidence, "mismatched-evidence", {
      evidenceText: "An unrelated saved note.",
      evidenceTextReviewed: true,
    });
    expect(readingEntries(mismatchedEvidence)).toHaveLength(1);

    const normalizedSource = fixtureRoot();
    fullNote(normalizedSource, "normalized-source", { sourceUrl: "https://example.com" });
    expect(readingEntries(normalizedSource)[0]?.source.url).toBe("https://example.com/");

    const longShortQuotation = fixtureRoot();
    fullNote(longShortQuotation, "long-short-quotation", {
      body: `> ${Array.from({ length: 26 }, (_, index) => `word${index + 1}`).join(" ")}`,
      republicationBasis: "short-quotation",
    });
    expect(() => readingEntries(longShortQuotation)).toThrow(
      "`short-quotation` republication basis requires a note of at most 25 words",
    );

    const unsupported = fixtureRoot();
    fullNote(unsupported, "unsafe", { body: "> <script>alert(1)</script>" });
    expect(() => readingEntries(unsupported)).toThrow("must be a non-empty paragraph");

    const privateLink = fixtureRoot();
    fullNote(privateLink, "private-link", { body: "> [[notes/private/source|private label]]" });
    expect(() => readingEntries(privateLink)).toThrow("must not contain private vault-link syntax");

    const splitPrivateLink = fixtureRoot();
    fullNote(splitPrivateLink, "split-private-link", { body: "> [*[*private/path*]*]" });
    expect(() => readingEntries(splitPrivateLink)).toThrow("must not contain private vault-link syntax");

    const privateSummary = fixtureRoot();
    const privateSummaryPath = fullNote(privateSummary, "private-summary");
    write(
      privateSummaryPath,
      readFileSync(privateSummaryPath, "utf8").replace(
        "A complete short passage preserved as a dated reading note.",
        "A public summary of [[notes/private/source|private evidence]].",
      ),
    );
    expect(() => readingEntries(privateSummary)).toThrow("must not contain private vault-link syntax");

    const empty = fixtureRoot();
    fullNote(empty, "empty", { body: "> &#32;" });
    expect(() => readingEntries(empty)).toThrow("must contain visible text");

    const invisible = fixtureRoot();
    fullNote(invisible, "invisible", { body: "> &#8203;" });
    expect(() => readingEntries(invisible)).toThrow(
      "must not contain control or invisible formatting characters",
    );

    const futureSaved = fixtureRoot();
    fullNote(futureSaved, "future-saved", { saved: "2099-12", reviewed: "2026-08-03" });
    expect(() => readingEntries(futureSaved)).toThrow(
      "reading.saved must not be later than reading.reviewed",
    );

    const hiddenEvidence = fixtureRoot();
    const evidenceOnlyInFrontmatter = [
      "---",
      'title: "This is a complete passage with reviewed formatting. It can’t be taught. It can only be caught."',
      "---",
      "An unrelated visible evidence note.",
    ].join("\n");
    fullNote(hiddenEvidence, "hidden-evidence", { evidenceText: evidenceOnlyInFrontmatter });
    expect(() => readingEntries(hiddenEvidence)).toThrow("does not occur in the evidence note");

    const omittedEvidence = fixtureRoot();
    fullNote(omittedEvidence, "omitted-evidence", {
      body: "> Alpha Beta",
      evidenceText: "Alpha\n\n<div>intervening words</div>\n\nBeta",
    });
    expect(() => readingEntries(omittedEvidence)).toThrow("does not occur in the evidence note");

    const selfEvidence = fixtureRoot();
    fullNote(selfEvidence, "self-evidence", { evidenceId: "notes/reading/self-evidence" });
    expect(() => readingEntries(selfEvidence)).toThrow(
      "evidence must be an original KB note outside `notes/reading`",
    );

    const caseAliasedEvidence = fixtureRoot();
    fullNote(caseAliasedEvidence, "case-aliased-evidence", {
      evidenceId: "notes/Reading/case-aliased-evidence",
    });
    expect(() => readingEntries(caseAliasedEvidence)).toThrow(
      "evidence must be an original KB note outside `notes/reading`",
    );
  });

  test("fails closed on unknown URL stripping, duplicate sources, and malformed sections", () => {
    const unknownQuery = fixtureRoot();
    capture(unknownQuery, "query", { sourceUrl: "https://example.com/story?edition=full&utm_source=mail" });
    note(unknownQuery, "query", { sourceUrl: "https://example.com/story" });
    expect(() => readingEntries(unknownQuery)).toThrow("does not match the capture canonical URL");

    const duplicate = fixtureRoot();
    capture(duplicate, "first", { sourceUrl: "https://example.com/shared" });
    note(duplicate, "first", { sourceUrl: "https://example.com/shared" });
    capture(duplicate, "second", { sourceUrl: "https://example.com/shared" });
    note(duplicate, "second", { sourceUrl: "https://example.com/shared" });
    expect(() => readingEntries(duplicate)).toThrow("duplicate source URL");

    const malformed = fixtureRoot();
    capture(malformed, "malformed");
    const path = note(malformed, "malformed");
    write(path, readFileSync(path, "utf8").replace("## Ideas", "## Extra\n\nUnexpected.\n\n## Ideas"));
    expect(() => readingEntries(malformed)).toThrow("sections must appear exactly in order");

    const privatePublicMetadata = fixtureRoot();
    capture(privatePublicMetadata, "private-public-metadata", {
      title: "A source from [[notes/private/path|private evidence]]",
    });
    note(privatePublicMetadata, "private-public-metadata");
    expect(() => readingEntries(privatePublicMetadata)).toThrow(
      "must not contain private vault-link syntax",
    );

    const aliasedProvenance = fixtureRoot();
    fullNote(aliasedProvenance, "canonical-first", {
      evidenceId: "notes/quotes/shared-evidence",
    });
    symlinkSync(
      join(aliasedProvenance, "kb/notes/quotes"),
      join(aliasedProvenance, "kb/notes/quote-alias"),
      "dir",
    );
    fullNote(aliasedProvenance, "canonical-second", {
      evidenceId: "notes/quote-alias/shared-evidence",
    });
    expect(() => readingEntries(aliasedProvenance)).toThrow("duplicate provenance relation");
  });
});

describe("reading synchronization", () => {
  test("writes canonical bytes atomically and keeps check mode read-only", () => {
    const root = fixtureRoot();
    capture(root, "sync");
    const notePath = note(root, "sync");
    const first = syncReading({ repositoryRoot: root });
    const output = generatedReadingPath(root);
    expect(first).toEqual({ path: output, status: "written", entries: 1 });
    expect(readFileSync(output, "utf8")).toBe(expectedReadingModule(root));
    expect(readdirSync(dirname(output)).some((name) => name.startsWith(".reading-sync-"))).toBe(false);
    expect(syncReading({ repositoryRoot: root, check: true }).status).toBe("unchanged");

    const original = readFileSync(output, "utf8");
    write(notePath, readFileSync(notePath, "utf8").replace("status: published", "status: draft"));
    expect(() => syncReading({ repositoryRoot: root, check: true })).toThrow("is stale");
    expect(readFileSync(output, "utf8")).toBe(original);
    expect(readdirSync(dirname(output)).some((name) => name.startsWith(".reading-sync-"))).toBe(false);
  });

  test("check mode does not create a missing output directory", () => {
    const root = fixtureRoot();
    capture(root, "check");
    note(root, "check");
    expect(() => syncReading({ repositoryRoot: root, check: true })).toThrow("is stale");
    expect(existsSync(join(root, "personal-website"))).toBe(false);
  });
});

describe("reading inbox and CLI", () => {
  test("lists only unrelated manifest-backed web captures with review signals", () => {
    const root = fixtureRoot();
    capture(root, "related", { clipped: "2026-08-03" });
    note(root, "related", { status: "draft" });
    capture(root, "partial", { clipped: "2026-08-02", status: "partial", scope: "thread" });
    capture(root, "private", { clipped: "2026-08-01", method: "browser-live", warningCount: 2 });
    const pdfDirectory = join(root, "kb/articles/document");
    write(join(pdfDirectory, "capture.json"), `${JSON.stringify({
      schemaVersion: 1,
      kind: "pdf",
      capturedAt: "2026-08-04T00:00:00.000Z",
      status: "complete",
    })}\n`);

    const report = readingInbox(root);
    expect(report).toMatchObject({
      advisory: true,
      totalWebCaptures: 3,
      relatedCaptures: 1,
      pendingCaptures: 2,
    });
    expect(report.items.map(({ id, reason, eligibleByDefault, warningCount }) => ({
      id,
      reason,
      eligibleByDefault,
      warningCount,
    }))).toEqual([
      {
        id: "articles/partial/partial",
        reason: "partial-capture",
        eligibleByDefault: false,
        warningCount: 0,
      },
      {
        id: "articles/private/private",
        reason: "private-acquisition",
        eligibleByDefault: false,
        warningCount: 2,
      },
    ]);
    expect(existsSync(join(root, "personal-website"))).toBe(false);
  });

  test("treats an article capture used as complete-note evidence as related", () => {
    const root = fixtureRoot();
    const evidenceId = "articles/article-evidence/article-evidence";
    const body = [
      "> This is a *complete passage* with reviewed formatting.",
      ">",
      "> **It can’t be *taught.***  ",
      "> **It can only be *caught.***",
    ].join("\n");
    fullNote(root, "from-article-evidence", { body, evidenceId });
    capture(root, "article-evidence", { body });

    expect(readingInbox(root)).toMatchObject({
      totalWebCaptures: 1,
      relatedCaptures: 1,
      pendingCaptures: 0,
      items: [],
    });
  });

  test("parses exclusive CLI modes and keeps inbox JSON read-only", () => {
    const root = fixtureRoot();
    capture(root, "pending");
    expect(parseReadingCommand(["--check", "--root", root])).toEqual({
      mode: "check",
      repositoryRoot: root,
    });
    expect(() => parseReadingCommand(["--check", "--inbox"], root)).toThrow("mutually exclusive");
    expect(() => parseReadingCommand(["--json"], root)).toThrow("requires --inbox");
    const command = parseReadingCommand(["--inbox", "--json"], root);
    const output = JSON.parse(runReadingCommand(command)) as { pendingCaptures: number };
    expect(output.pendingCaptures).toBe(1);
    expect(existsSync(join(root, "projects"))).toBe(false);
  });
});
