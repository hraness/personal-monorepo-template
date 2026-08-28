import {
  always,
  eventually,
  extract,
  type ActionGenerator,
  type Formula,
  type JSON as BombadilJson,
} from "@antithesishq/bombadil";
import type {
  ActionTemplate,
  State as BombadilBrowserState,
} from "@antithesishq/bombadil/browser";
import {
  createDirectBombadilActions,
  createDirectBombadilProperties,
} from "@hraness/direct/tooling/bombadil-campaign";

export * from "@antithesishq/bombadil/browser/defaults/properties";

interface HomepageObservation {
  readonly [key: string | number | symbol]: BombadilJson;
  readonly heading: string;
  readonly selectedAppearance: string;
  readonly surfacePresent: boolean;
  readonly theme: string;
}

const homepage = extract<BombadilBrowserState, HomepageObservation>((state) => {
  const surface = state.document.querySelector(
    '[data-product-surface="personal-homepage/v1"]',
  );
  const selectedAppearance = state.document.querySelector<HTMLInputElement>(
    '[data-slot="segmented-control"][aria-label="Appearance"] input[type="radio"]:checked',
  );
  return {
    heading: surface?.querySelector("h1")?.textContent?.trim() ?? "",
    selectedAppearance: selectedAppearance?.value ?? "",
    surfacePresent: surface !== null,
    theme: surface?.getAttribute("data-theme") ?? "",
  };
}).named("personalHomepage");
const properties = createDirectBombadilProperties();

export const direct_safe_actions: ActionGenerator<ActionTemplate> =
  createDirectBombadilActions();
export const direct_exact_contract: Formula = properties.exactContract;
export const direct_stable_catalog: Formula = properties.stableCatalog;
export const direct_no_declared_violations: Formula = properties.noDeclaredViolations;
export const direct_eventual_quiescence: Formula = properties.eventualQuiescence;
export const personal_homepage_persists: Formula = always(
  eventually(() => {
    const { heading, surfacePresent } = homepage.current;
    return surfacePresent
      && (heading === "your name"
        || heading === "a person with an unusually long public name");
  }).within(10, "seconds"),
);
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
