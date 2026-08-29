import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");

function read(path: string): string {
  return readFileSync(join(repositoryRoot, path), "utf8");
}

describe("optional editorial-image documentation", () => {
  test("is discoverable from the repository and website guides", () => {
    for (const path of ["AGENTS.md", "README.md", "personal-website/AGENTS.md"]) {
      expect(read(path)).toContain("docs/editorial-images.md");
    }

    expect(read("personal-website/README.md")).toContain("../docs/editorial-images.md");
  });

  test("keeps the opt-in image contract explicit", () => {
    const guide = read("docs/editorial-images.md").replace(/\s+/g, " ");

    for (const requirement of [
      "typed record authoritative",
      "visible semantic `<figure>`",
      "Open Graph and Twitter metadata",
      "`Article`, `BlogPosting`, or `NewsArticle` JSON-LD",
      "Atom enclosure or RSS enclosure/media",
      "image sitemap",
      "Largest Contentful Paint",
      "Lazy-load card thumbnails",
      "full-size image and a small thumbnail",
      "desktop and mobile widths",
      "SHA-256",
      "receipt",
      "Do not add decorative interstitials",
    ]) {
      expect(guide).toContain(requirement);
    }
  });
});
