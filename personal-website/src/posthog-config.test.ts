import { describe, expect, test } from "bun:test";

import { optionalPostHogConfiguration } from "./posthog-config";

describe("optional PostHog configuration", () => {
  test("requires a complete canonical HTTPS configuration", () => {
    expect(optionalPostHogConfiguration({})).toBeNull();
    expect(optionalPostHogConfiguration({
      NEXT_PUBLIC_SITE_URL: "https://person.example",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
    })).toEqual({
      apiHost: "https://us.i.posthog.com",
      apiKey: "phc_public",
      canonicalOrigin: "https://person.example",
    });
  });

  test("rejects paths, insecure hosts, and secret-shaped keys", () => {
    expect(optionalPostHogConfiguration({
      NEXT_PUBLIC_SITE_URL: "https://person.example/preview",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
    })).toBeNull();
    expect(optionalPostHogConfiguration({
      NEXT_PUBLIC_SITE_URL: "https://person.example",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com/proxy",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
    })).toBeNull();
    expect(optionalPostHogConfiguration({
      NEXT_PUBLIC_SITE_URL: "https://person.example",
      NEXT_PUBLIC_POSTHOG_HOST: "http://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
    })).toBeNull();
    expect(optionalPostHogConfiguration({
      NEXT_PUBLIC_SITE_URL: "https://person.example",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phx_secret",
    })).toBeNull();
  });
});
