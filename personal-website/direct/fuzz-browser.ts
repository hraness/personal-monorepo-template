#!/usr/bin/env bun
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDirectBombadilFuzz } from "@hraness/direct/tooling/bombadil";

const directRoot = fileURLToPath(new URL(".", import.meta.url));
const productRoot = resolve(directRoot, "..");
const repositoryRoot = resolve(productRoot, "..");

await runDirectBombadilFuzz({
  artifactName: "personal-monorepo-template",
  baseUrl: "http://127.0.0.1:5193",
  entryPath: "/direct/",
  expectedRoute: "/",
  label: "Personal monorepo template Direct Bombadil fuzzing",
  repositoryRoot,
  scenario: "homepage.light",
  specificationPath: resolve(directRoot, "bombadil-campaign.ts"),
  server: {
    command: [
      process.execPath,
      "run",
      "dev:direct",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "{port}",
      "--strictPort",
    ],
    cwd: productRoot,
    env: { CI: "1" },
    readinessPath: "/direct/",
    startupTimeoutMs: 30_000,
  },
}, process.argv.slice(2));
