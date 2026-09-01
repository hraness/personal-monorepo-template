import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");
const readme = readFileSync(join(repositoryRoot, "README.md"), "utf8");
const readmeNormalized = readme.replace(/\s+/g, " ");
const packageManifest = JSON.parse(
  readFileSync(join(repositoryRoot, "package.json"), "utf8"),
) as {
  packageManager: string;
  engines: { node: string };
  scripts: Record<string, string>;
};

describe("product-led repository guide", () => {
  test("leads from result to first proof before inventory", () => {
    const result = readme.indexOf("Build a personal website");
    const firstProof = readme.indexOf("## First proof: make it yours");
    const authorities = readme.indexOf("## One repository, four authorities");
    const interfaces = readme.indexOf("## The working interfaces");

    expect(result).toBeGreaterThan(-1);
    expect(firstProof).toBeGreaterThan(result);
    expect(authorities).toBeGreaterThan(firstProof);
    expect(interfaces).toBeGreaterThan(authorities);
  });

  test("keeps the first session executable and aligned with the manifest", () => {
    for (const command of [
      "bun install --frozen-lockfile",
      "bun run dev",
      "bun run kb:check:lane",
      "bun run dev:direct",
      "bun run check",
    ]) {
      expect(readme).toContain(command);
    }

    for (const script of ["dev", "kb:check:lane", "dev:direct", "check"]) {
      expect(packageManifest.scripts[script]).toBeString();
    }

    expect(readme).toContain(`Bun ${packageManifest.packageManager.split("@")[1]}`);
    expect(readme).toContain(`Node.js ${packageManifest.engines.node.replace(".x", "")}`);
  });

  test("states the private, development, and provider boundaries", () => {
    for (const boundary of [
      "Production never reads the vault",
      "Direct uses the real shared homepage",
      "rejected from the production build",
      "Repository visibility also controls KB visibility",
      "does not create or control a Vercel account",
      "does not grant ambient authority",
      "No database or authentication layer is included",
    ]) {
      expect(readmeNormalized).toContain(boundary);
    }
  });

  test("keeps every starter authority and next action discoverable", () => {
    for (const surface of [
      "`personal-website/`",
      "`kb/`",
      "`.agents/skills/`",
      "`scripts/`, Direct, and CI",
      "personal-website/src/site.ts",
      "personal-website/app/reading/entries.generated.ts",
      "personal-website/app/bookshelf/books.ts",
      "docs/editorial-images.md",
    ]) {
      expect(readme).toContain(surface);
    }

    expect(readme).toContain("## Questions before you start");
    expect(readme).toContain("### What should I change first?");
  });
});
