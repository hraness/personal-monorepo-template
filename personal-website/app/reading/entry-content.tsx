import { Fragment } from "react";

import type { ReadingAuthor, ReadingEntry, ReadingInline } from "./entries";

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const monthDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function invalidReadingDate(date: string): never {
  throw new Error(`Invalid Reading date: ${date}`);
}

export function formatReadingDate(date: string): string {
  if (/^\d{4}$/u.test(date)) return date;
  if (/^\d{4}-\d{2}$/u.test(date)) {
    const parsed = new Date(`${date}-01T00:00:00.000Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 7) !== date) {
      return invalidReadingDate(date);
    }
    return monthDateFormatter.format(parsed);
  }
  if (/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
      return invalidReadingDate(date);
    }
    return longDateFormatter.format(parsed);
  }
  return invalidReadingDate(date);
}

function SourceAuthor({ author }: Readonly<{ author: ReadingAuthor }>) {
  return author.url === undefined ? author.name : <a href={author.url}>{author.name}</a>;
}

function ReadingInlineContent({
  nodes,
  path,
}: Readonly<{ nodes: readonly ReadingInline[]; path: string }>) {
  return nodes.map((node, index) => {
    const key = `${path}-${index}`;
    if (node.kind === "text") return <Fragment key={key}>{node.value}</Fragment>;
    if (node.kind === "break") return <br key={key} />;
    const children = <ReadingInlineContent nodes={node.children} path={key} />;
    return node.kind === "emphasis"
      ? <em key={key}>{children}</em>
      : <strong key={key}>{children}</strong>;
  });
}

export function ReadingSourceMetadata({ entry }: Readonly<{ entry: ReadingEntry }>) {
  return (
    <p className="reading-source-meta">
      <span>
        by{" "}
        {entry.source.authors.map((author, index) => (
          <span key={`${author.name}-${author.url ?? "unlinked"}`}>
            {index === 0 ? null : index === entry.source.authors.length - 1 ? " and " : ", "}
            <SourceAuthor author={author} />
          </span>
        ))}
      </span>
      <span aria-hidden="true"> · </span>
      <a href={entry.source.publication.url}>{entry.source.publication.name}</a>
      {entry.source.publishedAt === undefined ? null : (
        <>
          <span aria-hidden="true"> · </span>
          <span>
            published{" "}
            <time dateTime={entry.source.publishedAt}>
              {formatReadingDate(entry.source.publishedAt)}
            </time>
          </span>
        </>
      )}
    </p>
  );
}

function ReadingFullNote({
  content,
  sourceUrl,
}: Readonly<{
  content: Extract<ReadingEntry["content"], { kind: "note" }>;
  sourceUrl: ReadingEntry["source"]["url"];
}>) {
  return (
    <figure className="reading-full-note">
      <blockquote cite={sourceUrl}>
        {content.paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.children.length}`}>
            <ReadingInlineContent nodes={paragraph.children} path={`paragraph-${index}`} />
          </p>
        ))}
      </blockquote>
      <figcaption>
        <a href={sourceUrl}>
          <ReadingInlineContent nodes={content.citation} path="citation" />
        </a>
      </figcaption>
    </figure>
  );
}

export function ReadingNotes({
  entry,
  headingLevel = 2,
}: Readonly<{ entry: ReadingEntry; headingLevel?: 2 | 3 | 4 }>) {
  if (entry.content.kind === "note") {
    return <ReadingFullNote content={entry.content} sourceUrl={entry.source.url} />;
  }

  const { content } = entry;
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h4";
  return (
    <div className="reading-notes">
      <section aria-labelledby={`${entry.slug}-gist`}>
        <Heading id={`${entry.slug}-gist`}>gist</Heading>
        <p>{content.gist}</p>
      </section>
      <section aria-labelledby={`${entry.slug}-ideas`}>
        <Heading id={`${entry.slug}-ideas`}>ideas</Heading>
        <ul>
          {content.ideas.map((idea) => (
            <li key={idea.title}><strong>{idea.title}</strong> {idea.detail}</li>
          ))}
        </ul>
      </section>
      {content.quotes.length === 0 ? null : (
        <section aria-labelledby={`${entry.slug}-quotes`}>
          <Heading id={`${entry.slug}-quotes`}>quotes</Heading>
          <div className="reading-quote-group">
            {content.quotes.map((quote) => (
              <figure className="reading-quote" key={quote.text}>
                <blockquote cite={entry.source.url}><p>“{quote.text}”</p></blockquote>
                <figcaption>{quote.attribution}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
