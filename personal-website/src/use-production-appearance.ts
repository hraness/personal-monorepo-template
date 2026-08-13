"use client";

import { useState } from "react";

import type { AppearancePort, AppearancePreference } from "./appearance-port";
import { createMemoryAppearancePort } from "./appearance-port";
import { createBrowserAppearancePort } from "./browser-appearance-port";

function createLazyBrowserAppearancePort(): AppearancePort {
  const initial = createMemoryAppearancePort({ preference: "system", resolved: "light" });
  let browser: AppearancePort | null = null;
  let subscribers = 0;

  const ensureBrowser = (): AppearancePort | null => {
    if (browser === null && typeof globalThis.window !== "undefined") {
      browser = createBrowserAppearancePort(globalThis.window);
    }
    return browser;
  };

  return Object.freeze({
    dispose: () => {
      browser?.dispose();
      browser = null;
      initial.dispose();
      return undefined;
    },
    // Rendering and hydration read the same deterministic snapshot. The
    // browser adapter is created only when React subscribes after hydration.
    getSnapshot: () => (browser ?? initial).getSnapshot(),
    setPreference: (preference: AppearancePreference) => (
      ensureBrowser() ?? initial
    ).setPreference(preference),
    subscribe: (listener: () => void) => {
      const port = ensureBrowser() ?? initial;
      subscribers += 1;
      const unsubscribe = port.subscribe(listener);
      queueMicrotask(listener);
      return () => {
        unsubscribe();
        subscribers -= 1;
        if (subscribers === 0 && browser !== null) {
          browser.dispose();
          browser = null;
        }
      };
    },
  });
}

export function useProductionAppearance(): AppearancePort {
  const [appearance] = useState<AppearancePort>(createLazyBrowserAppearancePort);
  return appearance;
}
