import { describe, expect, test } from "bun:test";

import {
  captureFirstMountedHomepage,
  homepageAppearanceLawHolds,
  homepageSurfaceLawHolds,
  isHomepageInteractionObservation,
  isHomepageObservation,
  type HomepageInteractionObservation,
  type HomepageObservation,
} from "./bombadil-campaign";
import {
  assertHomepageBombadilCatalog,
  homepageBombadilCampaigns,
} from "./bombadil-matrix";
import { websiteDirectDefinition } from "./scenarios";

describe("homepage Bombadil matrix", () => {
  test("accepts only the exact bounded named-snapshot shapes", () => {
    const homepage = {
      activeScenario: "homepage.light",
      aboutPresent: true,
      appearanceControlPresent: true,
      appearanceErrorPresent: false,
      heading: "your name",
      libraryLinkCount: 2,
      projectCount: 1,
      selectedAppearance: "light",
      socialLinkCount: 1,
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
      theme: "light",
      viewportHeight: 900,
      viewportWidth: 1_280,
    } satisfies HomepageObservation;
    expect(isHomepageObservation(homepage)).toBeTrue();
    expect(isHomepageObservation({
      ...homepage,
      viewportHeight: 900.5,
    })).toBeFalse();
    expect(isHomepageObservation({
      ...homepage,
      unexpected: "field",
    })).toBeFalse();
    expect(isHomepageObservation({
      activeScenario: homepage.activeScenario,
      aboutPresent: homepage.aboutPresent,
      appearanceControlPresent: homepage.appearanceControlPresent,
      appearanceErrorPresent: homepage.appearanceErrorPresent,
      heading: homepage.heading,
      libraryLinkCount: homepage.libraryLinkCount,
      projectCount: homepage.projectCount,
      selectedAppearance: homepage.selectedAppearance,
      socialLinkCount: homepage.socialLinkCount,
      surfaceMarker: homepage.surfaceMarker,
      surfacePresent: homepage.surfacePresent,
      theme: homepage.theme,
      viewportHeight: homepage.viewportHeight,
    })).toBeFalse();

    const interaction = {
      activeScenario: homepage.activeScenario,
      appearanceErrorPresent: false,
      selectedAppearance: homepage.selectedAppearance,
      theme: homepage.theme,
    } satisfies HomepageInteractionObservation;
    expect(isHomepageInteractionObservation(interaction)).toBeTrue();
    expect(isHomepageInteractionObservation({
      ...interaction,
      selectedAppearance: false,
    })).toBeFalse();
    expect(isHomepageInteractionObservation({
      ...interaction,
      viewportWidth: homepage.viewportWidth,
    })).toBeFalse();
    expect(isHomepageObservation(Object.create(homepage))).toBeFalse();
    expect(isHomepageObservation(Object.defineProperty({ ...homepage }, "heading", {
      enumerable: true,
      get: () => "your name",
    }))).toBeFalse();
    expect(isHomepageObservation({ ...homepage, [Symbol("hostile")]: true })).toBeFalse();
    expect(isHomepageObservation(new Proxy(homepage, {
      ownKeys: () => {
        throw new Error("hostile proxy");
      },
    }))).toBeFalse();
  });

  test("keeps ready surface and appearance laws strict", () => {
    const surface = {
      aboutPresent: true,
      appearanceControlPresent: true,
      libraryLinkCount: 2,
      projectCount: 1,
      socialLinkCount: 1,
      surfaceMarker: "personal-homepage/v1",
      surfacePresent: true,
    } as const;
    expect(homepageSurfaceLawHolds({
      ...surface,
      activeScenario: "homepage.light",
      heading: "your name",
    })).toBe(true);
    expect(homepageSurfaceLawHolds({
      ...surface,
      activeScenario: "homepage.light",
      heading: "temporarily wrong",
    })).toBe(false);
    expect(homepageSurfaceLawHolds({
      ...surface,
      activeScenario: "homepage.long-content",
      heading: "a person with an unusually long public name",
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
      aboutPresent: false,
      appearanceControlPresent: false,
      appearanceErrorPresent: false,
      heading: "",
      libraryLinkCount: 0,
      projectCount: 0,
      selectedAppearance: "",
      socialLinkCount: 0,
      surfaceMarker: "",
      surfacePresent: false,
      theme: "",
    };
    const validMount = {
      activeScenario: "homepage.light",
      aboutPresent: true,
      appearanceControlPresent: true,
      appearanceErrorPresent: false,
      heading: "your name",
      libraryLinkCount: 2,
      projectCount: 1,
      selectedAppearance: "light",
      socialLinkCount: 1,
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
      "system-dark-wide",
      "long-content-narrow",
      "appearance-write-failure",
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
      expect(
        campaign.explorationPolicy.minNamedSnapshotChangesAfterActionKind,
      ).toEqual({
        personalHomepage: { SetViewport: 1 },
        personalHomepageInteraction: { Click: 1 },
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
