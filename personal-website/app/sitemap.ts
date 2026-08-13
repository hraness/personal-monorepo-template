import type { MetadataRoute } from "next";

import { BOOKSHELF_PATH } from "./bookshelf/books";
import { READING_PATH } from "./feeds/paths";
import { readingEntries, readingEntryHref, readingUpdatedAt } from "./reading/entries";
import { publicSite } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: publicSite.canonicalUrl,
      ...(readingUpdatedAt === undefined ? {} : { lastModified: new Date(readingUpdatedAt) }),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${publicSite.canonicalUrl}${READING_PATH}`,
      ...(readingUpdatedAt === undefined ? {} : { lastModified: new Date(readingUpdatedAt) }),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${publicSite.canonicalUrl}${BOOKSHELF_PATH}`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...readingEntries.map((entry) => ({
      url: `${publicSite.canonicalUrl}${readingEntryHref(entry)}`,
      lastModified: new Date(entry.reviewedAt),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
