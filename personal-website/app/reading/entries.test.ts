import { describe, expect, test } from "bun:test";

import {
  formatCompactReadingDate,
  readingEntries,
  readingUpdatedAt,
} from "./entries";
import { readingAtomResponse, readingAtomXml } from "./feed";

describe("reading registry", () => {
  test("starts empty without fabricating personal reading history", () => {
    expect(readingEntries).toEqual([]);
    expect(readingUpdatedAt).toBeUndefined();
  });

  test("formats reviewed month and day precision without local-time drift", () => {
    expect(formatCompactReadingDate("2026-08", 2026)).toBe("Aug");
    expect(formatCompactReadingDate("2025-08", 2026)).toBe("Aug 2025");
    expect(formatCompactReadingDate("2026-08-13", 2026)).toBe("Aug 13");
    expect(() => formatCompactReadingDate("2026-02-30", 2026)).toThrow("Invalid Reading date");
  });

  test("publishes an Atom endpoint even before the first note", () => {
    const xml = readingAtomXml();
    expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(xml).toContain("/reading/atom.xml");
    const response = readingAtomResponse();
    expect(response.headers.get("content-type")).toBe("application/atom+xml; charset=utf-8");
  });
});
