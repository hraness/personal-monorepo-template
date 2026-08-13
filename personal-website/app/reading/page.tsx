import type { Metadata } from "next";
import Link from "next/link";

import { READING_ATOM_PATH, READING_PATH } from "../feeds/paths";
import { JsonLdScript } from "../seo/json-ld";
import { publicSite } from "../site";
import {
  formatCompactReadingDate,
  readingEntries,
  readingEntryDescription,
  readingEntryHref,
} from "./entries";

const title = `reading · ${publicSite.name}`;
const description = `Reading notes saved and reviewed by ${publicSite.name}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: READING_PATH,
    types: {
      "application/atom+xml": [{ title: `${publicSite.name}’s reading notes`, url: READING_ATOM_PATH }],
    },
  },
  openGraph: { type: "website", url: READING_PATH, title, description },
  twitter: { card: "summary", title, description },
};

export default function ReadingPage() {
  const currentYear = new Date().getUTCFullYear();
  const url = `${publicSite.canonicalUrl}${READING_PATH}`;
  return (
    <main className="content-page reading-index">
      <JsonLdScript
        id="reading-collection-structured-data"
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${url}#collection`,
          url,
          name: title,
          description,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: readingEntries.length,
            itemListElement: readingEntries.map((entry, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${publicSite.canonicalUrl}${readingEntryHref(entry)}`,
              name: entry.title,
            })),
          },
        }}
      />
      <nav aria-label="breadcrumb"><Link href="/">{publicSite.name}</Link></nav>
      <header>
        <h1>reading</h1>
        <p><a href={READING_ATOM_PATH}>atom feed</a></p>
      </header>
      {readingEntries.length === 0 ? (
        <p className="empty-collection">No published reading notes yet.</p>
      ) : (
        <ol className="reading-list">
          {readingEntries.map((entry) => (
            <li key={entry.slug}>
              <article>
                <h2><Link href={readingEntryHref(entry)}>{entry.title}</Link></h2>
                <p className="collection-meta">
                  <time dateTime={entry.savedAt}>
                    {formatCompactReadingDate(entry.savedAt, currentYear)}
                  </time>
                  <span aria-hidden="true"> · </span>
                  <a href={entry.source.url}>{entry.source.publication.name}</a>
                </p>
                <p>{readingEntryDescription(entry)}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
