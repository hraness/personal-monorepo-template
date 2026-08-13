import { describe, expect, test } from "bun:test";

import { bookshelfBooks, bookshelfReadingLabel } from "./books";

describe("bookshelf data", () => {
  test("starts empty without inheriting another person's books", () => {
    expect(bookshelfBooks).toEqual([]);
  });

  test("formats current and completed reading states", () => {
    expect(bookshelfReadingLabel({ status: "reading", startedAt: "2026-08" })).toBe("reading now");
    expect(bookshelfReadingLabel({ status: "read", readAt: "2026-08" })).toBe("read aug 2026");
  });
});
