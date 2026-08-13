import { createDirectSession } from "@hraness/direct/testing";

import type { PersonalSiteContent } from "../src/site";
import {
  createDeterministicAppearancePort,
  type DeterministicAppearancePort,
} from "./deterministic-appearance-port";
import { websiteDirectDefinition } from "./scenarios";

export interface WebsiteDirectHarness {
  readonly appearance: DeterministicAppearancePort;
  readonly content: PersonalSiteContent;
  readonly blockedNetworkRequests: () => number;
  readonly activityFailures: () => number;
  readonly recordBlockedNetworkRequest: () => void;
  readonly recordActivityFailure: () => void;
  readonly remainingWork: () => {
    readonly activityFailures: number;
    readonly blockedNetworkRequests: number;
  };
}

export function createWebsiteDirectSession(source: string) {
  return createDirectSession({
    definition: websiteDirectDefinition,
    activation: { kind: "query", source },
    create: (context): WebsiteDirectHarness => {
      const appearance = createDeterministicAppearancePort({
        appearance: context.world.appearance,
        signal: context.signal,
      });
      context.onDispose(appearance.dispose);
      let blockedNetworkRequests = 0;
      let activityFailures = 0;
      return Object.freeze({
        appearance,
        content: context.world.content,
        blockedNetworkRequests: () => blockedNetworkRequests,
        activityFailures: () => activityFailures,
        recordBlockedNetworkRequest: () => {
          blockedNetworkRequests += 1;
        },
        recordActivityFailure: () => {
          activityFailures += 1;
        },
        remainingWork: () => Object.freeze({
          blockedNetworkRequests,
          activityFailures,
        }),
      });
    },
    observe: (harness) => ({
      violations: [
        { name: "blockedNetworkRequests", read: harness.blockedNetworkRequests },
        { name: "activityFailures", read: harness.activityFailures },
      ],
      readRemainingWork: harness.remainingWork,
    }),
  });
}
