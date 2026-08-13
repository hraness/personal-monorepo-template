import { describe, expect, test } from "bun:test";

import { createRootPageviewFilter } from "./posthog-redaction";

describe("PostHog pageview redaction", () => {
  test("retains only root-page and ingestion properties", () => {
    const filter = createRootPageviewFilter("https://person.example");
    const event = filter({
      event: "$pageview",
      properties: {
        token: "phc_public",
        distinct_id: "$posthog_cookieless",
        $device_id: "$posthog_cookieless",
        $cookieless_mode: "always",
        $lib: "web",
        $lib_version: "test",
        $current_url: "https://person.example/private?token=sensitive#fragment",
        $pathname: "/private",
        $referrer: "https://sensitive.example/inbox",
        $title: "Private title",
        $browser: "Example Browser",
        utm_campaign: "private-campaign",
        $screen_height: 1_080,
      },
      $set: { email: "person@example.com" },
      uuid: "00000000-0000-4000-8000-000000000000",
    });

    expect(event).toEqual({
      event: "$pageview",
      properties: {
        token: "phc_public",
        distinct_id: "$posthog_cookieless",
        $device_id: "$posthog_cookieless",
        $cookieless_mode: "always",
        $lib: "web",
        $lib_version: "test",
        $current_url: "https://person.example/",
        $host: "person.example",
        $pathname: "/",
        $process_person_profile: false,
      },
      timestamp: undefined,
      uuid: "00000000-0000-4000-8000-000000000000",
    });
  });

  test("drops every event other than the explicit root pageview", () => {
    const filter = createRootPageviewFilter("https://person.example");
    expect(filter(null)).toBeNull();
    expect(filter({
      event: "custom event",
      properties: { token: "phc_public", secret: "do not send" },
      uuid: "00000000-0000-4000-8000-000000000000",
    })).toBeNull();
  });
});
