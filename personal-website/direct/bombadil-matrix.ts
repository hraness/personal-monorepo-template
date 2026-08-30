import { websiteDirectDefinition } from "./scenarios";

const campaignMetadata = Object.freeze({
  "homepage.light": Object.freeze({
    artifactSuffix: "light-wide",
    expectedHeading: "your name",
    expectsWriteFailure: false,
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
    expectsWriteFailure: false,
    viewport: Object.freeze({ deviceScaleFactor: 1, height: 768, width: 1_024 }),
  }),
  "homepage.system-dark": Object.freeze({
    artifactSuffix: "system-dark-wide",
    expectedHeading: "your name",
    expectsWriteFailure: false,
    id: "system-dark-wide",
    initialAppearance: "system",
    initialTheme: "dark",
    viewport: Object.freeze({ deviceScaleFactor: 1, height: 900, width: 1_280 }),
  }),
  "homepage.long-content": Object.freeze({
    artifactSuffix: "long-content-narrow",
    expectedHeading: "a person with an unusually long public name",
    id: "long-content-narrow",
    initialAppearance: "system",
    initialTheme: "light",
    expectsWriteFailure: false,
    viewport: Object.freeze({ deviceScaleFactor: 2, height: 844, width: 390 }),
  }),
  "homepage.appearance-write-failure": Object.freeze({
    artifactSuffix: "appearance-write-failure",
    expectedHeading: "your name",
    expectsWriteFailure: true,
    id: "appearance-write-failure",
    initialAppearance: "light",
    initialTheme: "light",
    viewport: Object.freeze({ deviceScaleFactor: 1, height: 844, width: 390 }),
  }),
} as const);

export type HomepageBombadilScenario = keyof typeof campaignMetadata;
export type HomepageBombadilCampaignId =
  (typeof campaignMetadata)[HomepageBombadilScenario]["id"];

export interface HomepageBombadilCampaign {
  readonly artifactSuffix: string;
  readonly expectedHeading: string;
  readonly explorationPolicy: {
    readonly minDistinctNamedSnapshotValues: Readonly<Record<"personalHomepageInteraction", 2>>;
    readonly minNamedSnapshotChangesAfterActionKind: Readonly<{
      readonly personalHomepage: Readonly<Record<"SetViewport", 1>>;
      readonly personalHomepageInteraction: Readonly<Record<"Click", 1>>;
    }>;
    readonly minNamedSnapshotChangesAfterNonWait: Readonly<Record<"personalHomepageInteraction", 1>>;
    readonly minNonWaitActions: 4;
    readonly requireStableTargetUrl: true;
    readonly requiredActionKinds: readonly ["Click", "SetViewport"];
    readonly requiredNamedSnapshots: readonly [
      "direct",
      "personalHomepage",
      "personalHomepageInteraction",
    ];
  };
  readonly id: HomepageBombadilCampaignId;
  readonly expectsWriteFailure: boolean;
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
        minDistinctNamedSnapshotValues: Object.freeze({ personalHomepageInteraction: 2 }),
        minNamedSnapshotChangesAfterActionKind: Object.freeze({
          personalHomepage: Object.freeze({ SetViewport: 1 }),
          personalHomepageInteraction: Object.freeze({ Click: 1 }),
        }),
        minNamedSnapshotChangesAfterNonWait: Object.freeze({ personalHomepageInteraction: 1 }),
        minNonWaitActions: 4,
        requireStableTargetUrl: true,
        requiredActionKinds: Object.freeze(["Click", "SetViewport"] as const),
        requiredNamedSnapshots: Object.freeze([
          "direct",
          "personalHomepage",
          "personalHomepageInteraction",
        ] as const),
      }),
      scenario: scenario as HomepageBombadilScenario,
    });
  }));
