import { expect, test } from "bun:test";

import { createWebsiteDirectSession } from "./session";

test("deterministic appearance changes and is cleaned up by the session", () => {
  const created = createWebsiteDirectSession("");
  if (!created.ok) throw new Error(created.error.message);
  const { appearance } = created.value.harness;
  expect(appearance.getSnapshot()).toMatchObject({ preference: "light", resolved: "light" });
  expect(appearance.setPreference("dark")).toEqual({ ok: true });
  expect(appearance.getSnapshot()).toMatchObject({ preference: "dark", resolved: "dark" });
  expect(created.value.probe.snapshot()).toMatchObject({
    ok: true,
    value: { isQuiescent: true, violations: { activityFailures: 0, blockedNetworkRequests: 0 } },
  });
  created.value.dispose();
  expect(appearance.isDisposed()).toBeTrue();
  expect(appearance.setPreference("light")).toMatchObject({ ok: false });
});
