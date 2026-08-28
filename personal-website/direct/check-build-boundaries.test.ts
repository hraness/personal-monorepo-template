import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  checkBuildBoundary,
  checkProductionSourceBoundary,
  DIRECT_REQUIRED_MARKERS,
  SHARED_PRODUCT_MARKER,
} from "./check-build-boundaries";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {
    force: true,
    recursive: true,
  })));
});

async function outputFile(contents?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "personal-boundary-test-"));
  temporaryRoots.push(root);
  if (contents !== undefined) await writeFile(join(root, "bundle.js"), contents);
  return root;
}

async function sourceFiles(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "personal-source-boundary-test-"));
  temporaryRoots.push(root);
  for (const [relative, contents] of Object.entries(files)) {
    const file = join(root, relative);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents);
  }
  return root;
}

describe("emitted build boundaries", () => {
  test("rejects an empty output", async () => {
    const root = await outputFile();
    await expect(checkBuildBoundary("production", root)).rejects.toThrow(
      "production boundary found no emitted JavaScript",
    );
  });

  test("rejects forbidden Direct markers in production", async () => {
    const root = await outputFile([
      SHARED_PRODUCT_MARKER,
      "personal-website/browser-appearance-port/v1",
      "direct.browser-bridge/v2",
    ].join("\n"));
    await expect(checkBuildBoundary("production", root)).rejects.toThrow(
      "production output contains forbidden markers",
    );
  });

  test("rejects Bombadil from emitted production assets independently", async () => {
    const root = await outputFile([
      SHARED_PRODUCT_MARKER,
      "personal-website/browser-appearance-port/v1",
      "@antithesishq/bombadil",
    ].join("\n"));
    await expect(checkBuildBoundary("production", root)).rejects.toThrow(
      "@antithesishq/bombadil",
    );
  });

  test("rejects Bombadil and Direct imports from production source independently", async () => {
    const bombadilRoot = await sourceFiles({
      "app/page.tsx": 'import { always } from "@antithesishq/bombadil";',
    });
    await expect(checkProductionSourceBoundary(bombadilRoot)).rejects.toThrow(
      "@antithesishq/bombadil",
    );

    const directRoot = await sourceFiles({
      "src/production-homepage.tsx": 'import { installDirectBrowser } from "@hraness/direct/browser";',
    });
    await expect(checkProductionSourceBoundary(directRoot)).rejects.toThrow(
      "@hraness/direct",
    );
  });

  test("scans normal production roots without scanning the dev-only Direct tree", async () => {
    const root = await sourceFiles({
      "app/page.tsx": "export default function Page() { return null; }",
      "src/direction.ts": 'export const direction = "direct sunlight";',
      "direct/bombadil-campaign.ts": [
        'import { always } from "@antithesishq/bombadil";',
        'import { installDirectBrowser } from "@hraness/direct/browser";',
      ].join("\n"),
    });
    expect((await checkProductionSourceBoundary(root)).scannedFiles).toHaveLength(2);
  });

  test("rejects missing positive markers", async () => {
    const root = await outputFile("ordinary production code");
    await expect(checkBuildBoundary("production", root)).rejects.toThrow(
      "production output is missing positive markers",
    );
  });

  test("rejects appearance-adapter inversion in both graphs", async () => {
    const productionRoot = await outputFile([
      SHARED_PRODUCT_MARKER,
      "personal-website/browser-appearance-port/v1",
      "personal-website/deterministic-appearance-port/v1",
    ].join("\n"));
    await expect(checkBuildBoundary("production", productionRoot)).rejects.toThrow(
      "personal-website/deterministic-appearance-port/v1",
    );

    const directRoot = await outputFile([
      ...DIRECT_REQUIRED_MARKERS,
      "personal-website/browser-appearance-port/v1",
    ].join("\n"));
    await expect(checkBuildBoundary("direct", directRoot)).rejects.toThrow(
      "personal-website/browser-appearance-port/v1",
    );
  });
});
