import { generatedReadingEntries } from "./entries.generated";

const compactDayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const compactDayYearFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const compactMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const compactMonthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export type ReadingAuthor = Readonly<{
  kind?: "organization" | "person";
  name: string;
  url?: `https://${string}`;
}>;

export type ReadingSavedDate =
  | `${number}-${number}`
  | `${number}-${number}-${number}`;

export type ReadingPublishedDate = `${number}` | ReadingSavedDate;

export type ReadingInline =
  | Readonly<{ kind: "text"; value: string }>
  | Readonly<{ children: readonly ReadingInline[]; kind: "emphasis" | "strong" }>
  | Readonly<{ kind: "break" }>;

export type ReadingParagraph = Readonly<{
  children: readonly ReadingInline[];
  kind: "paragraph";
}>;

type ReadingEntryBase = Readonly<{
  reviewedAt: `${number}-${number}-${number}`;
  savedAt: ReadingSavedDate;
  slug: string;
  source: Readonly<{
    authors: readonly ReadingAuthor[];
    kind: "article" | "book";
    publication: Readonly<{
      name: string;
      url: `https://${string}`;
    }>;
    publishedAt?: ReadingPublishedDate;
    title: string;
    url: `https://${string}`;
  }>;
  title: string;
}>;

export type ReadingEntry = ReadingEntryBase & Readonly<{
  content:
    | Readonly<{
        gist: string;
        ideas: readonly Readonly<{ detail: string; title: string }>[];
        kind: "digest";
        quotes: readonly Readonly<{ attribution: string; text: string }>[];
      }>
    | Readonly<{
        citation: readonly ReadingInline[];
        kind: "note";
        paragraphs: readonly ReadingParagraph[];
        summary: string;
      }>;
}>;

export const readingEntries: readonly ReadingEntry[] = generatedReadingEntries;

function invalidCompactReadingDate(date: string): never {
  throw new Error(`Invalid Reading date: ${date}`);
}

export function formatCompactReadingDate(
  date: ReadingSavedDate,
  currentYear: number,
): string {
  if (/^\d{4}-\d{2}$/u.test(date)) {
    const parsed = new Date(`${date}-01T00:00:00.000Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 7) !== date) {
      return invalidCompactReadingDate(date);
    }
    return (parsed.getUTCFullYear() === currentYear
      ? compactMonthFormatter
      : compactMonthYearFormatter).format(parsed);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    return invalidCompactReadingDate(date);
  }
  return (parsed.getUTCFullYear() === currentYear
    ? compactDayFormatter
    : compactDayYearFormatter).format(parsed);
}

export function readingEntryHref(entry: Pick<ReadingEntry, "slug">) {
  return `/reading/${entry.slug}` as const;
}

export function getReadingEntry(slug: string): ReadingEntry | undefined {
  return readingEntries.find((entry) => entry.slug === slug);
}

export function readingEntryDescription(entry: ReadingEntry): string {
  const description = entry.content.kind === "digest"
    ? entry.content.gist
    : entry.content.summary;
  if (description.length <= 160) return description;
  const candidate = description.slice(0, 159);
  const lastSpace = candidate.lastIndexOf(" ");
  const boundary = lastSpace >= 100 ? lastSpace : candidate.length;
  return `${candidate.slice(0, boundary).trimEnd()}…`;
}

export const readingUpdatedAt = readingEntries.reduce<ReadingSavedDate | undefined>(
  (latest, entry) =>
    latest === undefined || entry.reviewedAt > latest ? entry.reviewedAt : latest,
  undefined,
);
