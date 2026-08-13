import { describe, expect, test } from "bun:test";

import { atomTimestamp, createAtomFeed } from "./atom";

describe("Atom serialization", () => {
  test("renders a valid empty feed with a deterministic updated time", () => {
    const xml = createAtomFeed({
      alternateUrl: "https://example.com/reading",
      author: { name: "A & B", url: "https://example.com/" },
      entries: [],
      id: "https://example.com/reading/atom.xml",
      selfUrl: "https://example.com/reading/atom.xml",
      subtitle: "Saved < carefully.",
      title: "Reading",
      updated: "1970-01-01",
    });
    expect(xml).toContain("<updated>1970-01-01T00:00:00Z</updated>");
    expect(xml).toContain("<name>A &amp; B</name>");
    expect(xml).toContain("Saved &lt; carefully.");
    expect(xml).not.toContain("<entry>");
  });

  test("rejects impossible dates and credentialed URLs", () => {
    expect(() => atomTimestamp("2026-02-30")).toThrow("Invalid Atom date");
    expect(() => createAtomFeed({
      alternateUrl: "https://user:secret@example.com/reading",
      author: { name: "Reader", url: "https://example.com/" },
      entries: [],
      id: "https://example.com/reading/atom.xml",
      selfUrl: "https://example.com/reading/atom.xml",
      subtitle: "Reading",
      title: "Reading",
      updated: "2026-08-13",
    })).toThrow("without credentials");
  });
});
