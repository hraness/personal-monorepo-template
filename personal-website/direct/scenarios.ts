import { defineDirect } from "@hraness/direct";

import { personalSite } from "../src/site";
import { createWebsiteDirectWorld, parseWebsiteDirectWorld } from "./world";

const DEFAULT_CONTENT = personalSite;

const LONG_CONTENT = Object.freeze({
  ...personalSite,
  name: "a person with an unusually long public name",
  introduction:
    "designer, developer, researcher, occasional teacher, and maker of small useful things whose labels need to remain readable on narrow screens.",
  projects: Object.freeze([
    ...personalSite.projects,
    Object.freeze({
      id: "long-running-research",
      label: "long-running research notebook",
      description:
        "a deliberately wordy project description that exercises wrapping without changing the compact structure of the real homepage",
      href: "https://example.com/research/notes-with-a-long-address",
    }),
    Object.freeze({
      id: "community-toolkit",
      label: "community toolkit",
      description: "small, composable guides for groups maintaining shared technical infrastructure",
      href: "https://example.com/community",
    }),
  ]),
  about:
    "I care about calm interfaces, durable knowledge, legible institutions, and software that leaves people with more agency. My work moves between product design, implementation, research, teaching, and the patient maintenance that keeps useful systems alive. This longer biography is deterministic input for inspecting wrapping and vertical rhythm, not a recommendation that every personal site should contain this much copy.",
});

export const websiteDirectDefinition = defineDirect({
  parseWorld: parseWebsiteDirectWorld,
  defaultScenario: "homepage.light",
  scenarios: [
    {
      id: "homepage.light",
      title: "Light appearance",
      description: "The real compact homepage with a deterministic light preference.",
      route: "/",
      world: createWebsiteDirectWorld({
        appearance: { preference: "light", resolved: "light", writeFailure: null },
        content: DEFAULT_CONTENT,
      }),
    },
    {
      id: "homepage.dark",
      title: "Dark appearance",
      description: "The real compact homepage with a deterministic dark preference.",
      route: "/",
      world: createWebsiteDirectWorld({
        appearance: { preference: "dark", resolved: "dark", writeFailure: null },
        content: DEFAULT_CONTENT,
      }),
    },
    {
      id: "homepage.system-dark",
      title: "System appearance resolving dark",
      description: "The real compact homepage with a deterministic system preference resolving to dark.",
      route: "/",
      world: createWebsiteDirectWorld({
        appearance: { preference: "system", resolved: "dark", writeFailure: null },
        content: DEFAULT_CONTENT,
      }),
    },
    {
      id: "homepage.long-content",
      title: "Long content",
      description: "Long names, descriptions, URLs, and biography text are supplied to the real layout for inspection.",
      route: "/",
      world: createWebsiteDirectWorld({
        appearance: { preference: "system", resolved: "light", writeFailure: null },
        content: LONG_CONTENT,
      }),
    },
    {
      id: "homepage.appearance-write-failure",
      title: "Appearance write failure",
      description: "The real compact homepage surfaces a deterministic appearance persistence failure.",
      route: "/",
      world: createWebsiteDirectWorld({
        appearance: {
          preference: "light",
          resolved: "light",
          writeFailure: "Appearance preference could not be saved.",
        },
        content: DEFAULT_CONTENT,
      }),
    },
  ],
  coverage: [
    {
      key: "homepage.light.render",
      mode: "fixture",
      claim: "The real homepage renders deterministic personal content with light tokens.",
      scenarios: ["homepage.light"],
    },
    {
      key: "homepage.dark.render",
      mode: "fixture",
      claim: "The real homepage renders deterministic personal content with dark tokens.",
      scenarios: ["homepage.dark"],
    },
    {
      key: "homepage.system-dark.render",
      mode: "fixture",
      claim: "The real homepage renders a deterministic system preference resolved to dark tokens.",
      scenarios: ["homepage.system-dark"],
    },
    {
      key: "homepage.long-content.model",
      mode: "fixture",
      claim: "The real homepage receives bounded long content through its production content model.",
      scenarios: ["homepage.long-content"],
    },
    {
      key: "homepage.appearance-write-failure.render",
      mode: "fixture",
      claim: "The real homepage exposes a deterministic appearance write failure without changing its selected preference.",
      scenarios: ["homepage.appearance-write-failure"],
    },
    {
      key: "appearance.browser.persistence",
      mode: "direct",
      claim: "Browser localStorage, matchMedia changes, and document theme mutation require production-adapter evidence.",
      scenarios: [],
    },
    {
      key: "analytics.posthog.delivery",
      mode: "direct",
      claim: "Canonical-origin eligibility and real PostHog ingestion require direct deployment evidence.",
      scenarios: [],
    },
    {
      key: "delivery.vercel.public",
      mode: "direct",
      claim: "Vercel configuration, canonical DNS, TLS, and public delivery require direct external evidence.",
      scenarios: [],
    },
  ],
});
