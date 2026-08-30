import {
  actions,
  always,
  eventually,
  extract,
  weighted,
  type ActionGenerator,
  type Formula,
} from "@antithesishq/bombadil";
import {
  getFingerprint,
  type ActionTemplate,
  type State as BombadilBrowserState,
} from "@antithesishq/bombadil/browser";
import {
  createDirectBombadilActions,
  createDirectBombadilNamedSnapshot,
  createDirectBombadilProperties,
} from "@hraness/direct/tooling/bombadil-campaign";

import { homepageBombadilCampaigns } from "./bombadil-matrix";
import {
  captureFirstMountedHomepage,
  homepageAppearanceLawHolds,
  homepageSurfaceLawHolds,
  isHomepageInteractionObservation,
  isHomepageObservation,
  type HomepageInitialSnapshot,
  type HomepageInteractionObservation,
  type HomepageObservation,
} from "./bombadil-model";

export {
  captureFirstMountedHomepage,
  homepageAppearanceLawHolds,
  homepageSurfaceLawHolds,
  isHomepageInteractionObservation,
  isHomepageObservation,
  type HomepageInitialSnapshot,
  type HomepageInteractionObservation,
  type HomepageObservation,
} from "./bombadil-model";

export * from "@antithesishq/bombadil/browser/defaults/properties";

interface HomepageInitialObservation extends HomepageInteractionObservation {
  readonly captured: boolean;
  readonly aboutPresent: boolean;
  readonly appearanceControlPresent: boolean;
  readonly heading: string;
  readonly libraryLinkCount: number;
  readonly projectCount: number;
  readonly socialLinkCount: number;
  readonly surfaceMarker: string;
  readonly surfacePresent: boolean;
}

function readActiveScenario(windowValue: unknown): string {
  try {
    if (typeof windowValue !== "object" || windowValue === null) return "";
    const bridge = Reflect.get(windowValue, "__direct") as unknown;
    if (typeof bridge !== "object" || bridge === null) return "";
    const manifest = Reflect.get(bridge, "manifest") as unknown;
    if (typeof manifest !== "object" || manifest === null) return "";
    const active = Reflect.get(manifest, "active") as unknown;
    if (typeof active !== "object" || active === null) return "";
    const scenario = Reflect.get(active, "scenario") as unknown;
    return typeof scenario === "string" ? scenario : "";
  } catch {
    return "";
  }
}

function interactionBlocked(window: Window, element: Element): boolean {
  let current: Element | null = element;
  while (current !== null) {
    const style = window.getComputedStyle(current);
    if (
      current.hasAttribute("disabled")
      || current.hasAttribute("hidden")
      || current.hasAttribute("inert")
      || current.getAttribute("aria-disabled") === "true"
      || current.getAttribute("aria-hidden") === "true"
      || style.display === "none"
      || style.pointerEvents === "none"
      || style.visibility === "hidden"
      || Number.parseFloat(style.opacity || "1") <= 0
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function visibleClickPoint(
  window: Window,
  element: Element,
): { readonly x: number; readonly y: number } | null {
  if (interactionBlocked(window, element)) return null;
  const rectangle = element.getBoundingClientRect();
  if (rectangle.width <= 0 || rectangle.height <= 0) return null;
  const point = {
    x: rectangle.left + rectangle.width / 2,
    y: rectangle.top + rectangle.height / 2,
  };
  if (
    point.x < 0
    || point.x >= window.innerWidth
    || point.y < 0
    || point.y >= window.innerHeight
  ) {
    return null;
  }
  const hit = element.ownerDocument.elementFromPoint(point.x, point.y);
  return hit !== null && (hit === element || element.contains(hit)) ? point : null;
}

function readHomepageObservation(state: BombadilBrowserState): HomepageObservation {
  const surface = state.document.querySelector(
    ".workbench-frame > *",
  );
  const selectedAppearance = state.document.querySelector<HTMLInputElement>(
    '[data-slot="segmented-control"][aria-label="Appearance"] input[type="radio"]:checked',
  );
  const appearanceError = state.document.querySelector(".appearance-error");
  return {
    activeScenario: readActiveScenario(state.window),
    aboutPresent: (surface?.querySelector("#about-heading + p") ?? null) !== null,
    appearanceControlPresent: (surface?.querySelector(
      '[data-slot="segmented-control"][aria-label="Appearance"]',
    ) ?? null) !== null,
    appearanceErrorPresent: (appearanceError?.textContent?.trim().length ?? 0) > 0,
    heading: surface?.querySelector("h1")?.textContent?.trim() ?? "",
    libraryLinkCount: surface?.querySelectorAll(".library-list > li").length ?? 0,
    projectCount: surface?.querySelectorAll(".project-list > li").length ?? 0,
    selectedAppearance: selectedAppearance?.value ?? "",
    socialLinkCount: surface?.querySelectorAll(".social-list > li").length ?? 0,
    surfaceMarker: surface?.getAttribute("data-product-surface") ?? "",
    surfacePresent: surface !== null,
    theme: surface?.getAttribute("data-theme") ?? "",
    viewportHeight: state.window.innerHeight,
    viewportWidth: state.window.innerWidth,
  };
}

const UNAVAILABLE_HOMEPAGE_OBSERVATION: HomepageObservation = Object.freeze({
  activeScenario: "",
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
  viewportHeight: 0,
  viewportWidth: 0,
});

const homepage = createDirectBombadilNamedSnapshot({
  fallback: UNAVAILABLE_HOMEPAGE_OBSERVATION,
  name: "personalHomepage",
  read: readHomepageObservation,
  validate: isHomepageObservation,
});
const homepageInteraction = createDirectBombadilNamedSnapshot({
  fallback: {
    activeScenario: "",
    appearanceErrorPresent: false,
    selectedAppearance: "",
    theme: "",
  },
  name: "personalHomepageInteraction",
  read: (state) => {
    const current = readHomepageObservation(state);
    return {
      activeScenario: current.activeScenario,
      appearanceErrorPresent: current.appearanceErrorPresent,
      selectedAppearance: current.selectedAppearance,
      theme: current.theme,
    };
  },
  validate: isHomepageInteractionObservation,
});

let firstMountedHomepage: HomepageInitialSnapshot | null = null;
const initialHomepage = extract<BombadilBrowserState, HomepageInitialObservation>((state) => {
  const current = readHomepageObservation(state);
  firstMountedHomepage = captureFirstMountedHomepage(firstMountedHomepage, {
    activeScenario: current.activeScenario,
    aboutPresent: current.aboutPresent,
    appearanceControlPresent: current.appearanceControlPresent,
    appearanceErrorPresent: current.appearanceErrorPresent,
    heading: current.heading,
    libraryLinkCount: current.libraryLinkCount,
    projectCount: current.projectCount,
    selectedAppearance: current.selectedAppearance,
    socialLinkCount: current.socialLinkCount,
    surfaceMarker: current.surfaceMarker,
    surfacePresent: current.surfacePresent,
    theme: current.theme,
  });
  return firstMountedHomepage === null
    ? {
        activeScenario: "",
        aboutPresent: false,
        appearanceControlPresent: false,
        appearanceErrorPresent: false,
        captured: false,
        heading: "",
        libraryLinkCount: 0,
        projectCount: 0,
        selectedAppearance: "",
        socialLinkCount: 0,
        surfaceMarker: "",
        surfacePresent: false,
        theme: "",
      }
    : { ...firstMountedHomepage, captured: true };
});

const appearanceTargets = extract((state: BombadilBrowserState) => {
  const targets: Array<{
    fingerprint: ReturnType<typeof getFingerprint>;
    point: { x: number; y: number };
  }> = [];
  for (const item of Array.from(state.document.querySelectorAll(
    '[data-slot="segmented-control"][aria-label="Appearance"] [data-slot="segmented-control-item"]',
  ))) {
    const input = item.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input === null || input.disabled || input.checked) continue;
    const point = visibleClickPoint(state.window, item);
    if (point === null) continue;
    targets.push({ fingerprint: getFingerprint(item), point });
  }
  return targets;
});
const viewport = extract((state: BombadilBrowserState) => ({
  height: state.window.innerHeight,
  width: state.window.innerWidth,
}));
const appearanceControlActions = actions<ActionTemplate>(() =>
  appearanceTargets.current.map(({ fingerprint, point }) => ({
    Click: { fingerprint, point },
  }))
);
const responsiveViewportActions = actions<ActionTemplate>(() =>
  homepageBombadilCampaigns
    .map((campaign) => campaign.viewport)
    .filter((candidate) =>
      candidate.height !== viewport.current.height
      || candidate.width !== viewport.current.width
    )
    .map((candidate) => ({
      SetViewport: { height: candidate.height, width: candidate.width },
    }))
);
const properties = createDirectBombadilProperties();

export function homepageAppearanceErrorLawHolds(
  observation: Pick<
    HomepageInteractionObservation,
    "activeScenario" | "appearanceErrorPresent" | "selectedAppearance" | "theme"
  >,
): boolean {
  if (!observation.appearanceErrorPresent) return true;
  const campaign = homepageBombadilCampaigns.find((candidate) =>
    candidate.scenario === observation.activeScenario
  );
  return campaign?.expectsWriteFailure === true
    && observation.selectedAppearance === campaign.initialAppearance
    && observation.theme === campaign.initialTheme;
}

export const direct_safe_actions: ActionGenerator<ActionTemplate> =
  weighted([
    [8, appearanceControlActions],
    [4, responsiveViewportActions],
    [3, createDirectBombadilActions()],
  ]);
export const direct_startup_contract: Formula = properties.startupContract;
export const direct_exact_contract: Formula = properties.exactContract;
export const direct_stable_catalog: Formula = properties.stableCatalog;
export const direct_no_declared_violations: Formula = properties.noDeclaredViolations;
export const direct_eventual_quiescence: Formula = properties.eventualQuiescence;
export const personal_homepage_mounts: Formula = eventually(() =>
  homepage.current.surfacePresent
).within(10, "seconds");
export const personal_homepage_persists: Formula = always(() =>
  !initialHomepage.current.captured || homepageSurfaceLawHolds(homepage.current)
);
export const personal_initial_world_matches_scenario: Formula = eventually(() => {
  const { activeScenario, captured, selectedAppearance, theme } = initialHomepage.current;
  const campaign = homepageBombadilCampaigns.find((candidate) =>
    candidate.scenario === activeScenario
  );
  return captured
    && homepageSurfaceLawHolds(initialHomepage.current)
    && campaign !== undefined
    && selectedAppearance === campaign.initialAppearance
    && theme === campaign.initialTheme;
}).within(10, "seconds");
export const personal_appearance_stays_coherent: Formula = always(() =>
  !initialHomepage.current.captured
  || homepageAppearanceLawHolds(homepage.current, homepageInteraction.current)
);
export const personal_appearance_errors_stay_bounded: Formula = always(() =>
  homepageAppearanceErrorLawHolds(homepageInteraction.current)
);
export const personal_configured_write_failure_is_reported: Formula = eventually(() => {
  const observation = homepageInteraction.current;
  if (!homepage.current.surfacePresent || observation.activeScenario === "") return false;
  return observation.activeScenario === "homepage.appearance-write-failure"
    ? observation.appearanceErrorPresent
    : !observation.appearanceErrorPresent;
});
