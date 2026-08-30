#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDirectBombadilFuzzMatrix } from "@hraness/direct/tooling/bombadil";

import {
  selectedHomepageBombadilCampaign,
  verifyHomepageBombadilUpload,
} from "./bombadil-artifacts";
import {
  assertHomepageBombadilCatalog,
  homepageBombadilCampaigns,
} from "./bombadil-matrix";
import { websiteDirectDefinition } from "./scenarios";

const directRoot = fileURLToPath(new URL(".", import.meta.url));
const productRoot = resolve(directRoot, "..");
const repositoryRoot = resolve(productRoot, "..");
const arguments_ = process.argv.slice(2);
const runId = process.env.DIRECT_BOMBADIL_RUN_ID ?? randomUUID();
const selectedCampaignId = selectedHomepageBombadilCampaign(arguments_);
assertHomepageBombadilCatalog(
  websiteDirectDefinition.scenarios.list().map((scenario) => scenario.id),
);

const fuzzCampaigns = homepageBombadilCampaigns.map((campaign) => ({
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

if (arguments_.some((argument) => argument === "--help" || argument === "-h")) {
  await runDirectBombadilFuzzMatrix(fuzzCampaigns, arguments_);
} else {
  let runFailure: unknown = null;
  try {
    await runDirectBombadilFuzzMatrix(fuzzCampaigns, {
      arguments: arguments_,
      artifactRun: {
        repositoryRoot,
        runId,
        uploadMode: "public-summary",
      },
    });
  } catch (error) {
    runFailure = error;
  }

  let evidenceFailure: unknown = null;
  try {
    await verifyHomepageBombadilUpload({ repositoryRoot, runId, selectedCampaignId });
  } catch (error) {
    evidenceFailure = error;
  }
  if (runFailure !== null && evidenceFailure !== null) {
    throw new AggregateError(
      [runFailure, evidenceFailure],
      "Bombadil matrix and its sanitized public evidence both failed.",
    );
  }
  if (runFailure !== null) throw runFailure;
  if (evidenceFailure !== null) throw evidenceFailure;
}
