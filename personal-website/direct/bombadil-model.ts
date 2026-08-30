import type { JSON as BombadilJson } from "@antithesishq/bombadil";

import { homepageBombadilCampaigns } from "./bombadil-matrix";

export interface HomepageObservation {
  readonly [key: string | number | symbol]: BombadilJson;
  readonly activeScenario: string;
  readonly aboutPresent: boolean;
  readonly appearanceControlPresent: boolean;
  readonly appearanceErrorPresent: boolean;
  readonly heading: string;
  readonly libraryLinkCount: number;
  readonly projectCount: number;
  readonly selectedAppearance: string;
  readonly socialLinkCount: number;
  readonly surfaceMarker: string;
  readonly surfacePresent: boolean;
  readonly theme: string;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
}

export interface HomepageInteractionObservation {
  readonly [key: string | number | symbol]: BombadilJson;
  readonly activeScenario: string;
  readonly appearanceErrorPresent: boolean;
  readonly selectedAppearance: string;
  readonly theme: string;
}

export interface HomepageInitialSnapshot extends HomepageInteractionObservation {
  readonly aboutPresent: boolean;
  readonly appearanceControlPresent: boolean;
  readonly heading: string;
  readonly libraryLinkCount: number;
  readonly projectCount: number;
  readonly socialLinkCount: number;
  readonly surfaceMarker: string;
  readonly surfacePresent: boolean;
}

const HOMEPAGE_OBSERVATION_STRING_KEYS = Object.freeze([
  "activeScenario",
  "heading",
  "selectedAppearance",
  "surfaceMarker",
  "theme",
] as const);
const HOMEPAGE_OBSERVATION_NUMBER_KEYS = Object.freeze([
  "libraryLinkCount",
  "projectCount",
  "socialLinkCount",
  "viewportHeight",
  "viewportWidth",
] as const);
const HOMEPAGE_OBSERVATION_BOOLEAN_KEYS = Object.freeze([
  "aboutPresent",
  "appearanceControlPresent",
  "appearanceErrorPresent",
  "surfacePresent",
] as const);
const HOMEPAGE_OBSERVATION_KEYS = Object.freeze([
  ...HOMEPAGE_OBSERVATION_STRING_KEYS,
  ...HOMEPAGE_OBSERVATION_NUMBER_KEYS,
  ...HOMEPAGE_OBSERVATION_BOOLEAN_KEYS,
]);
const HOMEPAGE_INTERACTION_OBSERVATION_KEYS = Object.freeze([
  "activeScenario",
  "appearanceErrorPresent",
  "selectedAppearance",
  "theme",
] as const);

function bombadilRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const record: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        return null;
      }
      record[key] = descriptor.value;
    }
    return record;
  } catch {
    return null;
  }
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

export function isHomepageObservation(
  value: unknown,
): value is HomepageObservation {
  const record = bombadilRecord(value);
  return record !== null
    && hasExactKeys(record, HOMEPAGE_OBSERVATION_KEYS)
    && HOMEPAGE_OBSERVATION_STRING_KEYS.every((key) =>
      typeof record[key] === "string"
    )
    && HOMEPAGE_OBSERVATION_NUMBER_KEYS.every((key) =>
      Number.isSafeInteger(record[key])
    )
    && HOMEPAGE_OBSERVATION_BOOLEAN_KEYS.every((key) =>
      typeof record[key] === "boolean"
    );
}

export function isHomepageInteractionObservation(
  value: unknown,
): value is HomepageInteractionObservation {
  const record = bombadilRecord(value);
  return record !== null
    && hasExactKeys(record, HOMEPAGE_INTERACTION_OBSERVATION_KEYS)
    && typeof record.appearanceErrorPresent === "boolean"
    && ["activeScenario", "selectedAppearance", "theme"].every((key) =>
      typeof record[key] === "string"
    );
}

export function captureFirstMountedHomepage(
  previous: HomepageInitialSnapshot | null,
  current: HomepageInitialSnapshot,
): HomepageInitialSnapshot | null {
  if (previous !== null || !current.surfacePresent) return previous;
  return Object.freeze({ ...current });
}

export function homepageSurfaceLawHolds(
  observation: Pick<
    HomepageObservation,
    | "aboutPresent"
    | "activeScenario"
    | "appearanceControlPresent"
    | "heading"
    | "libraryLinkCount"
    | "projectCount"
    | "socialLinkCount"
    | "surfaceMarker"
    | "surfacePresent"
  >,
): boolean {
  const campaign = homepageBombadilCampaigns.find((candidate) =>
    candidate.scenario === observation.activeScenario
  );
  return observation.surfacePresent
    && observation.aboutPresent
    && observation.appearanceControlPresent
    && observation.libraryLinkCount === 2
    && observation.projectCount > 0
    && observation.projectCount <= 12
    && observation.socialLinkCount > 0
    && observation.socialLinkCount <= 12
    && observation.surfaceMarker === "personal-homepage/v1"
    && campaign !== undefined
    && observation.heading === campaign.expectedHeading;
}

export function homepageAppearanceLawHolds(
  surface: Pick<HomepageObservation, "surfacePresent">,
  interaction: Pick<
    HomepageInteractionObservation,
    "selectedAppearance" | "theme"
  >,
): boolean {
  return surface.surfacePresent
    && (interaction.theme === "light" || interaction.theme === "dark")
    && (
      interaction.selectedAppearance === "light"
      || interaction.selectedAppearance === "dark"
      || interaction.selectedAppearance === "system"
    )
    && (
      interaction.selectedAppearance === "system"
      || interaction.selectedAppearance === interaction.theme
    );
}
