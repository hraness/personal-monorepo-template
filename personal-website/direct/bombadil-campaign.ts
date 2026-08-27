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
  readonly surfacePresent: boolean;
}

const homepage = extract<BombadilBrowserState, HomepageObservation>((state) => {
  const surface = state.document.querySelector(
    '[data-product-surface="personal-homepage/v1"]',
  );
  return {
    heading: surface?.querySelector("h1")?.textContent?.trim() ?? "",
    surfacePresent: surface !== null,
  };
});
const properties = createDirectBombadilProperties();

export const direct_safe_actions: ActionGenerator<ActionTemplate> =
  createDirectBombadilActions();
export const direct_exact_contract: Formula = properties.exactContract;
export const direct_stable_catalog: Formula = properties.stableCatalog;
export const direct_no_declared_violations: Formula = properties.noDeclaredViolations;
export const direct_eventual_quiescence: Formula = properties.eventualQuiescence;
export const personal_homepage_persists: Formula = always(
  eventually(() =>
    homepage.current.surfacePresent && homepage.current.heading === "your name"
  ).within(10, "seconds"),
);
