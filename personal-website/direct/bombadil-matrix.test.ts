import { describe, expect, test } from "bun:test";

import {
  captureFirstMountedHomepage,
  homepageAppearanceLawHolds,
  homepageSurfaceLawHolds,
} from "./bombadil-campaign";
import {
  assertHomepageBombadilCatalog,
  homepageBombadilCampaigns,
} from "./bombadil-matrix";
import { websiteDirectDefinition } from "./scenarios";

describe("homepage Bombadil matrix", () => {
  test("keeps ready surface and appearance laws strict", () => {
    expect(homepageSurfaceLawHolds({
      activeScenario: "homepage.light",
      heading: "your name",
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
    })).toBe(true);
    expect(homepageSurfaceLawHolds({
      activeScenario: "homepage.light",
      heading: "temporarily wrong",
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
    })).toBe(false);
    expect(homepageSurfaceLawHolds({
      activeScenario: "homepage.long-content",
      heading: "a person with an unusually long public name",
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
    })).toBe(true);
    expect(homepageAppearanceLawHolds(
      { surfacePresent: true },
      { selectedAppearance: "light", theme: "light" },
    )).toBe(true);
    expect(homepageAppearanceLawHolds(
      { surfacePresent: true },
      { selectedAppearance: "dark", theme: "dark" },
    )).toBe(true);
    expect(homepageAppearanceLawHolds(
      { surfacePresent: true },
      { selectedAppearance: "system", theme: "light" },
    )).toBe(true);
    expect(homepageAppearanceLawHolds(
      { surfacePresent: true },
      { selectedAppearance: "system", theme: "dark" },
    )).toBe(true);
    expect(homepageAppearanceLawHolds(
      { surfacePresent: true },
      { selectedAppearance: "dark", theme: "light" },
    )).toBe(false);
  });

  test("latches the first mounted surface before its scenario, marker, or heading can heal", () => {
    const absent = {
      activeScenario: "homepage.light",
      heading: "",
      selectedAppearance: "",
      surfaceMarker: "",
      surfacePresent: false,
      theme: "",
    };
    const validMount = {
      activeScenario: "homepage.light",
      heading: "your name",
      selectedAppearance: "light",
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
      theme: "light",
    };
    const invalidMounts = [
      { ...validMount, activeScenario: "homepage.unknown" },
      { ...validMount, surfaceMarker: "personal-homepage/v0" },
      { ...validMount, heading: "temporarily wrong" },
    ];

    expect(captureFirstMountedHomepage(null, absent)).toBeNull();
    for (const invalidMount of invalidMounts) {
      const captured = captureFirstMountedHomepage(null, invalidMount);
      expect(captured).toEqual(invalidMount);
      expect(homepageSurfaceLawHolds(captured!)).toBe(false);
      expect(captureFirstMountedHomepage(captured, validMount)).toBe(captured);
    }
  });

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
        "personalHomepageInteraction",
      ]);
      expect(campaign.explorationPolicy.minDistinctNamedSnapshotValues).toEqual({
        personalHomepageInteraction: 2,
      });
      expect(campaign.explorationPolicy.minNamedSnapshotChangesAfterNonWait).toEqual({
        personalHomepageInteraction: 1,
      });
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
