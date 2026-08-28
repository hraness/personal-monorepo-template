export const homepageBombadilCampaigns = Object.freeze([
  Object.freeze({ artifactSuffix: "light", scenario: "homepage.light" }),
  Object.freeze({ artifactSuffix: "dark", scenario: "homepage.dark" }),
  Object.freeze({ artifactSuffix: "long-content", scenario: "homepage.long-content" }),
] as const);

export type HomepageBombadilScenario =
  (typeof homepageBombadilCampaigns)[number]["scenario"];

export interface HomepageBombadilSelection {
  readonly campaigns: readonly (typeof homepageBombadilCampaigns)[number][];
  readonly runnerArguments: readonly string[];
}

function isScenario(input: string): input is HomepageBombadilScenario {
  return homepageBombadilCampaigns.some((campaign) => campaign.scenario === input);
}

export function parseHomepageBombadilSelection(
  arguments_: readonly string[],
): HomepageBombadilSelection {
  const runnerArguments: string[] = [];
  let selectedCampaign: HomepageBombadilScenario | null = null;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    let candidate: string | null = null;
    if (argument === "--campaign") {
      candidate = arguments_[index + 1] ?? null;
      index += 1;
      if (candidate === null || candidate.startsWith("-")) {
        throw new Error("--campaign requires a declared Direct scenario ID");
      }
    } else if (argument.startsWith("--campaign=")) {
      candidate = argument.slice("--campaign=".length);
    } else {
      runnerArguments.push(argument);
      continue;
    }

    if (!isScenario(candidate)) {
      throw new Error(`Unknown Bombadil scenario: ${candidate}`);
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
      : homepageBombadilCampaigns.filter((campaign) =>
        campaign.scenario === selectedCampaign
      ),
    runnerArguments: Object.freeze(runnerArguments),
  });
}
