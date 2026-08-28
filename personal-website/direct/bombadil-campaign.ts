import {
  actions,
  always,
  eventually,
  extract,
  weighted,
  type ActionGenerator,
  type Formula,
  type JSON as BombadilJson,
} from "@antithesishq/bombadil";
import {
  getFingerprint,
  type ActionTemplate,
  type State as BombadilBrowserState,
} from "@antithesishq/bombadil/browser";
import {
  createDirectBombadilActions,
  createDirectBombadilProperties,
} from "@hraness/direct/tooling/bombadil-campaign";

import { homepageBombadilCampaigns } from "./bombadil-matrix";

export * from "@antithesishq/bombadil/browser/defaults/properties";

interface HomepageObservation {
  readonly [key: string | number | symbol]: BombadilJson;
  readonly activeScenario: string;
  readonly heading: string;
  readonly selectedAppearance: string;
  readonly surfacePresent: boolean;
  readonly theme: string;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
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

function visibleClickPoint(
  window: Window,
  element: Element,
): { readonly x: number; readonly y: number } | null {
  const style = window.getComputedStyle(element);
  if (
    style.display === "none"
    || style.visibility === "hidden"
    || Number.parseFloat(style.opacity || "1") <= 0
  ) {
    return null;
  }
  const rectangle = element.getBoundingClientRect();
  if (rectangle.width <= 0 || rectangle.height <= 0) return null;
  const point = {
    x: rectangle.left + rectangle.width / 2,
    y: rectangle.top + rectangle.height / 2,
  };
  return point.x >= 0
      && point.x <= window.innerWidth
      && point.y >= 0
      && point.y <= window.innerHeight
    ? point
    : null;
}

const homepage = extract<BombadilBrowserState, HomepageObservation>((state) => {
  const surface = state.document.querySelector(
    '[data-product-surface="personal-homepage/v1"]',
  );
  const selectedAppearance = state.document.querySelector<HTMLInputElement>(
    '[data-slot="segmented-control"][aria-label="Appearance"] input[type="radio"]:checked',
  );
  return {
    activeScenario: readActiveScenario(state.window),
    heading: surface?.querySelector("h1")?.textContent?.trim() ?? "",
    selectedAppearance: selectedAppearance?.value ?? "",
    surfacePresent: surface !== null,
    theme: surface?.getAttribute("data-theme") ?? "",
    viewportHeight: state.window.innerHeight,
    viewportWidth: state.window.innerWidth,
  };
}).named("personalHomepage");

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

export const direct_safe_actions: ActionGenerator<ActionTemplate> =
  weighted([
    [8, appearanceControlActions],
    [4, responsiveViewportActions],
    [3, createDirectBombadilActions()],
  ]);
export const direct_exact_contract: Formula = properties.exactContract;
export const direct_stable_catalog: Formula = properties.stableCatalog;
export const direct_no_declared_violations: Formula = properties.noDeclaredViolations;
export const direct_eventual_quiescence: Formula = properties.eventualQuiescence;
export const personal_homepage_persists: Formula = always(
  eventually(() => {
    const { activeScenario, heading, surfacePresent } = homepage.current;
    const campaign = homepageBombadilCampaigns.find((candidate) =>
      candidate.scenario === activeScenario
    );
    return surfacePresent
      && campaign !== undefined
      && heading === campaign.expectedHeading;
  }).within(10, "seconds"),
);
export const personal_initial_world_matches_scenario: Formula = eventually(() => {
  const { activeScenario, selectedAppearance, theme } = homepage.current;
  const campaign = homepageBombadilCampaigns.find((candidate) =>
    candidate.scenario === activeScenario
  );
  return campaign !== undefined
    && selectedAppearance === campaign.initialAppearance
    && theme === campaign.initialTheme;
}).within(10, "seconds");
export const personal_appearance_stays_coherent: Formula = always(
  eventually(() => {
    const { selectedAppearance, surfacePresent, theme } = homepage.current;
    return surfacePresent
      && (theme === "light" || theme === "dark")
      && (selectedAppearance === "light"
        || selectedAppearance === "dark"
        || selectedAppearance === "system")
      && (selectedAppearance === "system" || selectedAppearance === theme);
  }).within(10, "seconds"),
);
