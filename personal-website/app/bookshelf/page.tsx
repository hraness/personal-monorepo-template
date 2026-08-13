import type { Metadata } from "next";

import { CollectionPageHeader } from "../collection-page-header";
import { JsonLdScript } from "../seo/json-ld";
import { publicSite } from "../site";
import { BOOKSHELF_PATH, bookshelfBooks, bookshelfReadingLabel } from "./books";

const title = `bookshelf · ${publicSite.name}`;
const description = `Books ${publicSite.name} is reading and has read, with brief notes.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: BOOKSHELF_PATH },
  openGraph: { type: "website", url: BOOKSHELF_PATH, title, description },
  twitter: { card: "summary", title, description },
};

export default function BookshelfPage() {
  const url = `${publicSite.canonicalUrl}${BOOKSHELF_PATH}`;
  return (
    <main className="content-page bookshelf-page">
      <JsonLdScript
        id="bookshelf-structured-data"
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${url}#collection`,
          url,
          name: title,
          description,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: bookshelfBooks.length,
            itemListElement: bookshelfBooks.map((book, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Book",
                name: book.title,
                author: { "@type": "Person", name: book.author },
                url: book.sourceUrl,
                datePublished: book.writtenYear,
              },
            })),
          },
        }}
      />
      <CollectionPageHeader title="bookshelf" />
      {bookshelfBooks.length === 0 ? (
        <p className="empty-collection">No books listed yet.</p>
      ) : (
        <ol className="bookshelf-list">
          {bookshelfBooks.map((book) => (
            <li key={`${book.author}:${book.title}`}>
              <article>
                <h2><a href={book.sourceUrl}>{book.title}</a></h2>
                <p>by {book.author}</p>
                <p className="collection-meta">
                  <time dateTime={book.reading.status === "read" ? book.reading.readAt : book.reading.startedAt}>
                    {bookshelfReadingLabel(book.reading)}
                  </time>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={book.writtenYear}>written {book.writtenYear}</time>
                </p>
                <p>{book.note}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
