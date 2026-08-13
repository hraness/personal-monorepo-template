import { describe, expect, test } from "bun:test";
import { SCENARIO_QUERY_KEY } from "@hraness/direct";
import { parseDirectSessionManifest } from "@hraness/direct/testing";

import { websiteDirectDefinition } from "./scenarios";
import { createWebsiteDirectSession } from "./session";

describe("personal website Direct definition", () => {
  test("activates every stable scenario and rejects an explicit unknown scenario", () => {
    for (const id of ["homepage.light", "homepage.dark", "homepage.long-content"]) {
      expect(websiteDirectDefinition.activate(`?${SCENARIO_QUERY_KEY}=${id}`)).toMatchObject({
        ok: true,
        value: { scenario: id, route: "/" },
      });
    }
    expect(websiteDirectDefinition.activate(`?${SCENARIO_QUERY_KEY}=missing`)).toMatchObject({
      ok: false,
      error: { code: "unknown-scenario" },
    });
  });

  test("keeps exact coverage and a round-trippable session manifest", () => {
    expect(websiteDirectDefinition.coverage.requireExactKeys([
      "homepage.light.render",
      "homepage.dark.render",
      "homepage.long-content.model",
      "appearance.browser.persistence",
      "analytics.posthog.delivery",
      "delivery.vercel.public",
    ])).toEqual({ ok: true, value: true });
    const created = createWebsiteDirectSession("");
    if (!created.ok) throw new Error(created.error.message);
    const parsed = parseDirectSessionManifest(JSON.parse(JSON.stringify(created.value.manifest)) as unknown);
    expect(parsed).toMatchObject({
      ok: true,
      value: { active: { scenario: "homepage.light" } },
    });
    created.value.dispose();
  });
});
