import { websiteDirectDefinition } from "./scenarios";

const campaignMetadata = Object.freeze({
  "homepage.light": Object.freeze({
    artifactSuffix: "light-wide",
    expectedHeading: "your name",
    id: "light-wide",
    initialAppearance: "light",
    initialTheme: "light",
    viewport: Object.freeze({ deviceScaleFactor: 1, height: 900, width: 1_280 }),
  }),
  "homepage.dark": Object.freeze({
    artifactSuffix: "dark-wide",
    expectedHeading: "your name",
    id: "dark-wide",
    initialAppearance: "dark",
    initialTheme: "dark",
    viewport: Object.freeze({ deviceScaleFactor: 1, height: 768, width: 1_024 }),
  }),
  "homepage.long-content": Object.freeze({
    artifactSuffix: "long-content-narrow",
    expectedHeading: "a person with an unusually long public name",
    id: "long-content-narrow",
    initialAppearance: "system",
    initialTheme: "light",
    viewport: Object.freeze({ deviceScaleFactor: 2, height: 844, width: 390 }),
  }),
} as const);

export type HomepageBombadilScenario = keyof typeof campaignMetadata;
export type HomepageBombadilCampaignId =
  (typeof campaignMetadata)[HomepageBombadilScenario]["id"];

export interface HomepageBombadilSelection {
  readonly campaigns: readonly HomepageBombadilCampaign[];
  readonly runnerArguments: readonly string[];
}

export interface HomepageBombadilCampaign {
  readonly artifactSuffix: string;
  readonly expectedHeading: string;
  readonly explorationPolicy: {
    readonly minDistinctNamedSnapshotValues: Readonly<Record<"personalHomepage", 2>>;
    readonly minNamedSnapshotChangesAfterNonWait: Readonly<Record<"personalHomepage", 1>>;
    readonly minNonWaitActions: 4;
    readonly requireStableTargetUrl: true;
    readonly requiredActionKinds: readonly ["Click", "SetViewport"];
    readonly requiredNamedSnapshots: readonly ["personalHomepage"];
  };
  readonly id: HomepageBombadilCampaignId;
  readonly initialAppearance: "dark" | "light" | "system";
  readonly initialTheme: "dark" | "light";
  readonly scenario: HomepageBombadilScenario;
  readonly viewport: {
    readonly deviceScaleFactor: number;
    readonly height: number;
    readonly width: number;
  };
}

export function assertHomepageBombadilCatalog(
  declaredScenarios: readonly string[],
  configuredScenarios: readonly string[] = Object.keys(campaignMetadata),
): void {
  const declared = new Set(declaredScenarios);
  const configured = new Set(configuredScenarios);
  const unconfigured = declaredScenarios.filter((scenario) => !configured.has(scenario));
  const stale = configuredScenarios.filter((scenario) => !declared.has(scenario));
  if (
    declared.size !== declaredScenarios.length
    || configured.size !== configuredScenarios.length
    || unconfigured.length > 0
    || stale.length > 0
  ) {
    const unconfiguredLabel = unconfigured.join(",") || "none";
    const staleLabel = stale.join(",") || "none";
    throw new Error(
      `Bombadil campaign catalog drift: unconfigured=${unconfiguredLabel}; stale=${staleLabel}`,
    );
  }
}

const declaredScenarios = websiteDirectDefinition.scenarios.list().map((scenario) =>
  scenario.id
);
assertHomepageBombadilCatalog(declaredScenarios);

export const homepageBombadilCampaigns: readonly HomepageBombadilCampaign[] =
  Object.freeze(declaredScenarios.map((scenario) => {
    const metadata = campaignMetadata[scenario as HomepageBombadilScenario];
    if (metadata === undefined) {
      throw new Error(`Direct scenario ${scenario} has no Bombadil campaign`);
    }
    return Object.freeze({
      ...metadata,
      explorationPolicy: Object.freeze({
        minDistinctNamedSnapshotValues: Object.freeze({ personalHomepage: 2 }),
        minNamedSnapshotChangesAfterNonWait: Object.freeze({ personalHomepage: 1 }),
        minNonWaitActions: 4,
        requireStableTargetUrl: true,
        requiredActionKinds: Object.freeze(["Click", "SetViewport"] as const),
        requiredNamedSnapshots: Object.freeze(["personalHomepage"] as const),
      }),
      scenario: scenario as HomepageBombadilScenario,
    });
  }));

function isCampaignId(input: string): input is HomepageBombadilCampaignId {
  return homepageBombadilCampaigns.some((campaign) => campaign.id === input);
}

export function parseHomepageBombadilSelection(
  arguments_: readonly string[],
): HomepageBombadilSelection {
  const runnerArguments: string[] = [];
  let selectedCampaign: HomepageBombadilCampaignId | null = null;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    let candidate: string | null = null;
    if (argument === "--campaign") {
      candidate = arguments_[index + 1] ?? null;
      index += 1;
      if (candidate === null || candidate.startsWith("-")) {
        throw new Error("--campaign requires a declared campaign ID");
      }
    } else if (argument.startsWith("--campaign=")) {
      candidate = argument.slice("--campaign=".length);
    } else {
      runnerArguments.push(argument);
      continue;
    }

    if (!isCampaignId(candidate)) {
      throw new Error(`Unknown Bombadil campaign: ${candidate}`);
    }
    if (selectedCampaign !== null) {
      throw new Error("--campaign may be supplied only once");
    }
    selectedCampaign = candidate;
  }

  const replays = runnerArguments.filter((argument) =>
    argument === "--replay" || argument.startsWith("--replay=")
  );
  if (replays.length > 0 && selectedCampaign === null) {
    throw new Error("--replay requires --campaign so trace attestation uses the original world");
  }

  return Object.freeze({
    campaigns: selectedCampaign === null
      ? homepageBombadilCampaigns
      : homepageBombadilCampaigns.filter((campaign) => campaign.id === selectedCampaign),
    runnerArguments: Object.freeze(runnerArguments),
  });
}
