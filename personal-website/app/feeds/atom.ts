export type AtomDate =
  | `${number}-${number}`
  | `${number}-${number}-${number}`;

export type AtomEntry = Readonly<{
  author?: string;
  id: string;
  published?: AtomDate;
  summary: string;
  title: string;
  updated: AtomDate;
  url: string;
  viaUrl?: string;
}>;

export type AtomFeed = Readonly<{
  alternateUrl: string;
  author: Readonly<{ name: string; url: string }>;
  entries: readonly AtomEntry[];
  id: string;
  selfUrl: string;
  subtitle: string;
  title: string;
  updated: AtomDate;
}>;

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function assertAbsoluteHttpUrl(value: string, label: string): void {
  const url = new URL(value);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:")
    || url.username !== ""
    || url.password !== ""
  ) {
    throw new TypeError(`${label} must be an absolute HTTP or HTTPS URL without credentials.`);
  }
}

export function atomTimestamp(value: AtomDate): string {
  const normalized = value.length === 7 ? `${value}-01` : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match === null) throw new TypeError(`Invalid Atom date: ${value}`);

  const timestamp = `${normalized}T00:00:00Z`;
  const parsed = new Date(timestamp);
  if (
    Number.isNaN(parsed.valueOf())
    || parsed.toISOString() !== `${normalized}T00:00:00.000Z`
  ) {
    throw new RangeError(`Invalid Atom date: ${value}`);
  }
  return timestamp;
}

export function createAtomFeed(feed: AtomFeed): string {
  assertAbsoluteHttpUrl(feed.id, "Feed ID");
  assertAbsoluteHttpUrl(feed.selfUrl, "Self URL");
  assertAbsoluteHttpUrl(feed.alternateUrl, "Alternate URL");
  assertAbsoluteHttpUrl(feed.author.url, "Author URL");

  for (const entry of feed.entries) {
    assertAbsoluteHttpUrl(entry.id, "Entry ID");
    assertAbsoluteHttpUrl(entry.url, "Entry URL");
    if (entry.viaUrl !== undefined) assertAbsoluteHttpUrl(entry.viaUrl, "Entry via URL");
  }

  const updated = feed.entries.reduce(
    (latest, entry) => {
      const candidate = atomTimestamp(entry.updated);
      return candidate > latest ? candidate : latest;
    },
    atomTimestamp(feed.updated),
  );

  const entries = feed.entries.map((entry) => {
    const author = entry.author === undefined
      ? []
      : [
          "    <author>",
          `      <name>${xmlEscape(entry.author)}</name>`,
          "    </author>",
        ];
    const published = entry.published === undefined
      ? []
      : [`    <published>${atomTimestamp(entry.published)}</published>`];
    const via = entry.viaUrl === undefined
      ? []
      : [`    <link rel="via" type="text/html" href="${xmlEscape(entry.viaUrl)}" />`];

    return [
      "  <entry>",
      `    <title type="text">${xmlEscape(entry.title)}</title>`,
      `    <link rel="alternate" type="text/html" href="${xmlEscape(entry.url)}" />`,
      ...via,
      `    <id>${xmlEscape(entry.id)}</id>`,
      ...author,
      ...published,
      `    <updated>${atomTimestamp(entry.updated)}</updated>`,
      `    <summary type="text">${xmlEscape(entry.summary)}</summary>`,
      "  </entry>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
    `  <title type="text">${xmlEscape(feed.title)}</title>`,
    `  <subtitle type="text">${xmlEscape(feed.subtitle)}</subtitle>`,
    `  <link rel="alternate" type="text/html" href="${xmlEscape(feed.alternateUrl)}" />`,
    `  <link rel="self" type="application/atom+xml" href="${xmlEscape(feed.selfUrl)}" />`,
    `  <id>${xmlEscape(feed.id)}</id>`,
    `  <updated>${updated}</updated>`,
    "  <author>",
    `    <name>${xmlEscape(feed.author.name)}</name>`,
    `    <uri>${xmlEscape(feed.author.url)}</uri>`,
    "  </author>",
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}

export function atomResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
