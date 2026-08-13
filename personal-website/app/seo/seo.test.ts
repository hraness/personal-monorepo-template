import { describe, expect, test } from "bun:test";

import manifest from "../manifest";
import robots from "../robots";
import sitemap from "../sitemap";
import { publicSite } from "../site";
import { serializeJsonLd } from "./json-ld";

describe("static discovery surfaces", () => {
  test("publishes canonical robots, sitemap, manifest, and collection routes", () => {
    expect(robots()).toMatchObject({
      host: publicSite.canonicalUrl,
      sitemap: `${publicSite.canonicalUrl}/sitemap.xml`,
    });
    expect(sitemap().map(({ url }) => url)).toEqual([
      publicSite.canonicalUrl,
      `${publicSite.canonicalUrl}/reading`,
      `${publicSite.canonicalUrl}/bookshelf`,
    ]);
    expect(manifest()).toMatchObject({
      name: publicSite.name,
      start_url: "/",
      display: "standalone",
    });
  });

  test("escapes JSON-LD so data cannot terminate its script element", () => {
    const serialized = serializeJsonLd({ value: "</script>&\u2028" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e\\u0026\\u2028");
  });
});
