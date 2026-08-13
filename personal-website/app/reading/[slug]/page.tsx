import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLdScript } from "../../seo/json-ld";
import { publicSite } from "../../site";
import {
  getReadingEntry,
  readingEntries,
  readingEntryDescription,
  readingEntryHref,
  type ReadingEntry,
} from "../entries";
import { formatReadingDate, ReadingNotes, ReadingSourceMetadata } from "../entry-content";

interface ReadingEntryPageProps {
  readonly params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return readingEntries.map(({ slug }) => ({ slug }));
}

function machinePublicationDate(entry: ReadingEntry): string | undefined {
  if (entry.content.kind === "digest") return entry.reviewedAt;
  return entry.savedAt.length === 10 ? entry.savedAt : undefined;
}

export async function generateMetadata({ params }: ReadingEntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getReadingEntry(slug);
  if (entry === undefined) return {};
  const url = readingEntryHref(entry);
  const title = `${entry.title} · reading · ${publicSite.name}`;
  const description = readingEntryDescription(entry);
  const publishedTime = machinePublicationDate(entry);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      ...(publishedTime === undefined ? {} : { publishedTime }),
    },
    twitter: { card: "summary", title, description },
  };
}

function readingEntryJsonLd(entry: ReadingEntry) {
  const url = `${publicSite.canonicalUrl}${readingEntryHref(entry)}`;
  const sourceType = entry.source.kind === "book" ? "Book" : "Article";
  const publicationDate = machinePublicationDate(entry);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#reading-note`,
    url,
    headline: entry.title,
    description: readingEntryDescription(entry),
    ...(publicationDate === undefined ? {} : { datePublished: publicationDate }),
    dateModified: entry.reviewedAt,
    author: { "@type": "Person", name: publicSite.name, url: publicSite.canonicalUrl },
    citation: entry.source.url,
    isBasedOn: {
      "@type": sourceType,
      url: entry.source.url,
      ...(entry.source.kind === "book"
        ? { name: entry.source.title }
        : { headline: entry.source.title }),
      author: entry.source.authors.map((author) => ({
        "@type": author.kind === "organization" ? "Organization" : "Person",
        name: author.name,
        ...(author.url === undefined ? {} : { url: author.url }),
      })),
      publisher: {
        "@type": "Organization",
        name: entry.source.publication.name,
        url: entry.source.publication.url,
      },
      ...(entry.source.publishedAt === undefined
        ? {}
        : { datePublished: entry.source.publishedAt }),
    },
  } as const;
}

export default async function ReadingEntryPage({ params }: ReadingEntryPageProps) {
  const { slug } = await params;
  const entry = getReadingEntry(slug);
  if (entry === undefined) notFound();

  return (
    <main className="content-page reading-detail">
      <JsonLdScript data={readingEntryJsonLd(entry)} id="reading-entry-structured-data" />
      <nav aria-label="breadcrumb">
        <Link href="/">{publicSite.name}</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/reading">reading</Link>
      </nav>
      <article>
        <header>
          <p className="collection-meta">
            saved <time dateTime={entry.savedAt}>{formatReadingDate(entry.savedAt)}</time>
          </p>
          <h1>{entry.title}</h1>
          <ReadingSourceMetadata entry={entry} />
          <p><a href={entry.source.url}>read the original source</a></p>
        </header>
        <ReadingNotes entry={entry} />
      </article>
    </main>
  );
}
