"use client";

import { useEffect } from "react";

import { optionalPostHogConfiguration } from "../src/posthog-config";
import { createRootPageviewFilter } from "../src/posthog-redaction";

const configuration = optionalPostHogConfiguration({
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

let initializedOrigin: string | null = null;

export function OptionalPostHogAnalytics() {
  useEffect(() => {
    if (
      configuration === null
      || globalThis.location.origin !== configuration.canonicalOrigin
      || initializedOrigin === configuration.canonicalOrigin
    ) {
      return;
    }

    let cancelled = false;
    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled || initializedOrigin === configuration.canonicalOrigin) return;
      posthog.init(configuration.apiKey, {
        api_host: configuration.apiHost,
        before_send: createRootPageviewFilter(configuration.canonicalOrigin),
        defaults: "2026-05-30",
        autocapture: false,
        rageclick: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_surveys_automatic_display: true,
        disable_product_tours: true,
        disable_conversations: true,
        advanced_disable_flags: true,
        advanced_disable_feature_flags: true,
        advanced_disable_feature_flags_on_first_load: true,
        person_profiles: "never",
        persistence: "memory",
        cookieless_mode: "always",
        respect_dnt: true,
        cross_subdomain_cookie: false,
        disableDeviceModel: true,
        disable_capture_url_hashes: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        properties_string_max_length: 512,
      });
      initializedOrigin = configuration.canonicalOrigin;
      posthog.capture("$pageview", {
        $current_url: `${configuration.canonicalOrigin}/`,
        $process_person_profile: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
