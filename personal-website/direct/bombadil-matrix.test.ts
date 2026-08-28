import { describe, expect, test } from "bun:test";

import {
  assertHomepageBombadilCatalog,
  homepageBombadilCampaigns,
} from "./bombadil-matrix";
import { websiteDirectDefinition } from "./scenarios";

describe("homepage Bombadil matrix", () => {
  test("matches every exact Direct scenario with one attainable config", () => {
    expect(homepageBombadilCampaigns.map((campaign) => campaign.scenario)).toEqual(
      websiteDirectDefinition.scenarios.list().map((scenario) => scenario.id),
    );
    expect(homepageBombadilCampaigns.map((campaign) => campaign.id)).toEqual([
      "light-wide",
      "dark-wide",
      "long-content-narrow",
    ]);
    for (const campaign of homepageBombadilCampaigns) {
      expect(campaign.viewport.width).toBeGreaterThanOrEqual(390);
      expect(campaign.viewport.height).toBeGreaterThanOrEqual(768);
      expect(campaign.explorationPolicy.requiredActionKinds).toEqual([
        "Click",
        "SetViewport",
      ]);
      expect(campaign.explorationPolicy.requiredNamedSnapshots).toEqual([
        "direct",
        "personalHomepage",
      ]);
    }
  });

  test("fails closed when the Direct catalog and campaign metadata drift", () => {
    expect(() => assertHomepageBombadilCatalog(
      ["homepage.light", "homepage.added"],
      ["homepage.light"],
    )).toThrow("unconfigured=homepage.added");
    expect(() => assertHomepageBombadilCatalog(
      ["homepage.light"],
      ["homepage.light", "homepage.removed"],
    )).toThrow("stale=homepage.removed");
  });
});
