import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";

import {
  parseDirectBombadilArtifactReceipt,
  parseDirectBombadilMatrixReceipt,
  parseDirectBombadilMatrixSummary,
  parseDirectBombadilSanitizedRunSummary,
  resolveDirectBombadilUploadLeaf,
  type DirectBombadilArtifactReceipt,
  type DirectBombadilMatrixReceipt,
  type DirectBombadilMatrixSummary,
  type DirectBombadilSanitizedRunSummary,
} from "@hraness/direct/tooling/bombadil";

import {
  homepageBombadilCampaigns,
  type HomepageBombadilCampaignId,
} from "./bombadil-matrix";

const MAX_PUBLIC_EVIDENCE_FILE_BYTES = 2 * 1024 * 1024;

interface ParseFailure {
  readonly message: string;
}

type ParseResult<Value> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: ParseFailure; ok: false }>;

export interface HomepageBombadilChildEvidenceInput {
  readonly receipt: unknown;
  readonly summary: unknown;
}

export interface HomepageBombadilEvidenceInput {
  readonly children: Readonly<Record<string, HomepageBombadilChildEvidenceInput>>;
  readonly matrixReceipt: unknown;
  readonly matrixSummary: unknown;
  readonly runId: string;
  readonly selectedCampaignId: HomepageBombadilCampaignId | null;
}

export interface VerifiedHomepageBombadilEvidence {
  readonly matrixReceipt: DirectBombadilMatrixReceipt;
  readonly matrixSummary: DirectBombadilMatrixSummary;
  readonly runReceipts: readonly DirectBombadilArtifactReceipt[];
  readonly runSummaries: readonly DirectBombadilSanitizedRunSummary[];
}

function parsedValue<Value>(result: ParseResult<Value>, label: string): Value {
  if (!result.ok) throw new Error(`${label} is invalid: ${result.error.message}`);
  return result.value;
}

function expectedCampaignStatus(
  campaignId: HomepageBombadilCampaignId,
  selectedCampaignId: HomepageBombadilCampaignId | null,
): "not-selected" | "passed" {
  return selectedCampaignId === null || selectedCampaignId === campaignId
    ? "passed"
    : "not-selected";
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} must equal ${JSON.stringify(expected)}.`);
  }
}

export function selectedHomepageBombadilCampaign(
  arguments_: readonly string[],
): HomepageBombadilCampaignId | null {
  let selected: string | null = null;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--campaign") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("-") || selected !== null) return null;
      selected = value;
      index += 1;
    } else if (argument?.startsWith("--campaign=")) {
      if (selected !== null) return null;
      selected = argument.slice("--campaign=".length);
    }
  }
  if (selected === null) return null;
  const match = homepageBombadilCampaigns.find((campaign) => campaign.id === selected);
  return match?.id ?? null;
}

export function verifyHomepageBombadilEvidence(
  input: HomepageBombadilEvidenceInput,
): VerifiedHomepageBombadilEvidence {
  const matrixReceipt = parsedValue(
    parseDirectBombadilMatrixReceipt(input.matrixReceipt),
    "Bombadil matrix receipt",
  );
  const matrixSummary = parsedValue(
    parseDirectBombadilMatrixSummary(input.matrixSummary),
    "Bombadil matrix summary",
  );
  assertEqual(matrixReceipt.runId, input.runId, "Bombadil matrix receipt runId");
  assertEqual(matrixReceipt.mode, "public-summary", "Bombadil matrix receipt mode");
  assertEqual(matrixReceipt.status, matrixSummary.status, "Bombadil matrix status");
  assertEqual(
    matrixReceipt.failureCode,
    matrixSummary.failureCode,
    "Bombadil matrix failureCode",
  );
  assertEqual(matrixReceipt.omittedCampaignCount, 0, "Bombadil omitted campaign count");
  assertEqual(
    matrixReceipt.campaigns.length,
    homepageBombadilCampaigns.length,
    "Bombadil campaign receipt count",
  );

  const counts = {
    failed: 0,
    notRun: 0,
    notSelected: 0,
    passed: 0,
    rejected: 0,
  };
  const runReceipts: DirectBombadilArtifactReceipt[] = [];
  const runSummaries: DirectBombadilSanitizedRunSummary[] = [];
  const expectedCampaignIds = new Set(homepageBombadilCampaigns.map((campaign) => campaign.id));
  for (const campaignId of Object.keys(input.children)) {
    if (!expectedCampaignIds.has(campaignId as HomepageBombadilCampaignId)) {
      throw new Error(`Bombadil retained unexpected child evidence for ${campaignId}.`);
    }
  }
  for (const [index, campaign] of homepageBombadilCampaigns.entries()) {
    const entry = matrixReceipt.campaigns[index];
    if (entry === undefined) throw new Error(`Bombadil campaign ${campaign.id} is missing.`);
    assertEqual(entry.index, index, `Bombadil campaign ${campaign.id} index`);
    assertEqual(entry.campaignId, campaign.id, `Bombadil campaign ${campaign.id} identity`);
    if (entry.status === "not-run") counts.notRun += 1;
    else if (entry.status === "not-selected") counts.notSelected += 1;
    else counts[entry.status] += 1;

    if (matrixReceipt.status === "passed") {
      assertEqual(
        entry.status,
        expectedCampaignStatus(campaign.id, input.selectedCampaignId),
        `Bombadil campaign ${campaign.id} terminal status`,
      );
    }

    const expectedReceiptPath = `campaigns/${campaign.id}/receipt.json`;
    if (entry.receipt === null) {
      if (Object.hasOwn(input.children, campaign.id)) {
        throw new Error(`Bombadil campaign ${campaign.id} retained unexpected child evidence.`);
      }
      continue;
    }
    const terminal = entry.status === "failed"
      || entry.status === "passed"
      || entry.status === "rejected";
    if (!terminal) {
      throw new Error(`Bombadil campaign ${campaign.id} has a receipt before termination.`);
    }
    assertEqual(entry.receipt, expectedReceiptPath, `Bombadil campaign ${campaign.id} receipt path`);
    const child = input.children[campaign.id];
    if (child === undefined) {
      throw new Error(`Bombadil campaign ${campaign.id} child evidence is missing.`);
    }
    const receipt = parsedValue(
      parseDirectBombadilArtifactReceipt(child.receipt),
      `Bombadil campaign ${campaign.id} receipt`,
    );
    const summary = parsedValue(
      parseDirectBombadilSanitizedRunSummary(child.summary),
      `Bombadil campaign ${campaign.id} summary`,
    );
    assertEqual(receipt.runId, input.runId, `Bombadil campaign ${campaign.id} runId`);
    assertEqual(receipt.mode, "public-summary", `Bombadil campaign ${campaign.id} mode`);
    assertEqual(
      receipt.diagnosticsRetained,
      false,
      `Bombadil campaign ${campaign.id} diagnosticsRetained`,
    );
    assertEqual(receipt.status, entry.status, `Bombadil campaign ${campaign.id} receipt status`);
    assertEqual(summary.status, receipt.status, `Bombadil campaign ${campaign.id} summary status`);
    assertEqual(
      summary.failureCode,
      receipt.failureCode,
      `Bombadil campaign ${campaign.id} failureCode`,
    );
    assertEqual(
      summary.artifactName,
      `personal-monorepo-template-${campaign.artifactSuffix}`,
      `Bombadil campaign ${campaign.id} artifact name`,
    );
    assertEqual(summary.scenario, campaign.scenario, `Bombadil campaign ${campaign.id} scenario`);
    if (entry.status === "passed") {
      assertEqual(
        summary.exploration?.policySatisfied,
        true,
        `Bombadil campaign ${campaign.id} exploration policy`,
      );
      assertEqual(
        summary.attestation?.invalidObservationCount,
        0,
        `Bombadil campaign ${campaign.id} invalid observations`,
      );
    }
    runReceipts.push(receipt);
    runSummaries.push(summary);
  }

  assertEqual(matrixSummary.campaigns.failed, counts.failed, "Bombadil failed count");
  assertEqual(matrixSummary.campaigns.notRun, counts.notRun, "Bombadil not-run count");
  assertEqual(
    matrixSummary.campaigns.notSelected,
    counts.notSelected,
    "Bombadil not-selected count",
  );
  assertEqual(matrixSummary.campaigns.passed, counts.passed, "Bombadil passed count");
  assertEqual(matrixSummary.campaigns.rejected, counts.rejected, "Bombadil rejected count");
  assertEqual(matrixSummary.campaigns.omitted, 0, "Bombadil summary omitted count");
  assertEqual(
    matrixSummary.campaigns.total,
    homepageBombadilCampaigns.length,
    "Bombadil summary total",
  );
  return Object.freeze({
    matrixReceipt,
    matrixSummary,
    runReceipts: Object.freeze(runReceipts),
    runSummaries: Object.freeze(runSummaries),
  });
}

async function readBoundedJson(path: string): Promise<unknown> {
  const handle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error("Bombadil public evidence must be a regular file.");
    if (before.size > MAX_PUBLIC_EVIDENCE_FILE_BYTES) {
      throw new Error(
        `Bombadil public evidence exceeds ${String(MAX_PUBLIC_EVIDENCE_FILE_BYTES)} bytes.`,
      );
    }
    const bytes = Buffer.allocUnsafe(MAX_PUBLIC_EVIDENCE_FILE_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const chunk = await handle.read(bytes, length, bytes.length - length, null);
      if (chunk.bytesRead === 0) break;
      length += chunk.bytesRead;
    }
    if (length > MAX_PUBLIC_EVIDENCE_FILE_BYTES) {
      throw new Error(
        `Bombadil public evidence exceeds ${String(MAX_PUBLIC_EVIDENCE_FILE_BYTES)} bytes.`,
      );
    }
    const after = await handle.stat();
    if (
      !after.isFile()
      || after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.size !== length
      || after.mtimeMs !== before.mtimeMs
      || after.ctimeMs !== before.ctimeMs
    ) {
      throw new Error("Bombadil public evidence changed during descriptor-bound admission.");
    }
    const contents = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
    return JSON.parse(contents) as unknown;
  } finally {
    await handle.close();
  }
}

export async function verifyHomepageBombadilUpload(options: Readonly<{
  repositoryRoot: string;
  runId: string;
  selectedCampaignId: HomepageBombadilCampaignId | null;
}>): Promise<VerifiedHomepageBombadilEvidence> {
  const leaf = resolveDirectBombadilUploadLeaf({
    repositoryRoot: options.repositoryRoot,
    runId: options.runId,
    uploadMode: "public-summary",
  });
  const matrixReceiptInput = await readBoundedJson(join(leaf, "receipt.json"));
  const matrixSummaryInput = await readBoundedJson(join(leaf, "summary.json"));
  const matrixReceipt = parsedValue(
    parseDirectBombadilMatrixReceipt(matrixReceiptInput),
    "Bombadil matrix receipt",
  );
  const children: Record<string, HomepageBombadilChildEvidenceInput> = {};
  for (const campaign of homepageBombadilCampaigns) {
    const entry = matrixReceipt.campaigns.find((candidate) => candidate.campaignId === campaign.id);
    if (entry?.receipt === null || entry === undefined) continue;
    const expectedReceipt = `campaigns/${campaign.id}/receipt.json`;
    assertEqual(entry.receipt, expectedReceipt, `Bombadil campaign ${campaign.id} receipt path`);
    children[campaign.id] = {
      receipt: await readBoundedJson(join(leaf, expectedReceipt)),
      summary: await readBoundedJson(join(leaf, "campaigns", campaign.id, "summary.json")),
    };
  }
  return verifyHomepageBombadilEvidence({
    children,
    matrixReceipt: matrixReceiptInput,
    matrixSummary: matrixSummaryInput,
    runId: options.runId,
    selectedCampaignId: options.selectedCampaignId,
  });
}
