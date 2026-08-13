import { expect, test } from "bun:test";

import { canonicalSiteOrigin } from "./site-url";

test("canonical site origin accepts only a root HTTPS URL", () => {
  expect(canonicalSiteOrigin("https://person.example/")).toBe("https://person.example");
  expect(canonicalSiteOrigin("http://person.example")).toBe("https://example.com");
  expect(canonicalSiteOrigin("https://person.example/private")).toBe("https://example.com");
  expect(canonicalSiteOrigin(undefined)).toBe("https://example.com");
});
