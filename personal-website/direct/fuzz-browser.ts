#!/usr/bin/env bun
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDirectBombadilFuzz } from "@hraness/direct/tooling/bombadil";

import { parseHomepageBombadilSelection } from "./bombadil-matrix";

const directRoot = fileURLToPath(new URL(".", import.meta.url));
const productRoot = resolve(directRoot, "..");
const repositoryRoot = resolve(productRoot, "..");

const selection = parseHomepageBombadilSelection(process.argv.slice(2));
// This is the additive Direct matrix descriptor shape. The reviewed Direct
// upgrade can replace the temporary serial loop with runDirectBombadilFuzzMatrix.
const fuzzCampaigns = selection.campaigns.map((campaign) => ({
  id: campaign.id,
  config: {
    artifactName: `personal-monorepo-template-${campaign.artifactSuffix}`,
    baseUrl: "http://127.0.0.1:5193",
    entryPath: "/direct/" as const,
    expectedRoute: "/",
    explorationPolicy: campaign.explorationPolicy,
    label: `Personal monorepo template ${campaign.scenario} Direct Bombadil fuzzing`,
    repositoryRoot,
    scenario: campaign.scenario,
    specificationPath: resolve(directRoot, "bombadil-campaign.ts"),
    viewport: campaign.viewport,
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
      readinessPath: "/direct/" as const,
      startupTimeoutMs: 30_000,
    },
  },
}));

for (const campaign of fuzzCampaigns) {
  const result = await runDirectBombadilFuzz(
    campaign.config,
    selection.runnerArguments,
  );
  if (result.kind === "help") break;
}
