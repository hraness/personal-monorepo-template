import { atomResponse, createAtomFeed } from "../feeds/atom";
import { READING_ATOM_PATH, READING_PATH } from "../feeds/paths";
import { publicSite } from "../site";
import {
  readingEntries,
  readingEntryDescription,
  readingEntryHref,
  readingUpdatedAt,
} from "./entries";

function absoluteUrl(path: `/${string}`): string {
  return new URL(path, publicSite.canonicalUrl).toString();
}

export function readingAtomXml(): string {
  return createAtomFeed({
    alternateUrl: absoluteUrl(READING_PATH),
    author: {
      name: publicSite.name,
      url: absoluteUrl("/"),
    },
    entries: readingEntries.map((entry) => {
      const url = absoluteUrl(readingEntryHref(entry));
      return {
        id: url,
        published: entry.savedAt,
        summary: readingEntryDescription(entry),
        title: entry.title,
        updated: entry.reviewedAt,
        url,
        viaUrl: entry.source.url,
      };
    }),
    id: absoluteUrl(READING_ATOM_PATH),
    selfUrl: absoluteUrl(READING_ATOM_PATH),
    subtitle: `Reading notes saved and reviewed by ${publicSite.name}.`,
    title: `${publicSite.name}’s reading notes`,
    updated: readingUpdatedAt ?? "1970-01-01",
  });
}

export function readingAtomResponse(): Response {
  return atomResponse(readingAtomXml());
}
