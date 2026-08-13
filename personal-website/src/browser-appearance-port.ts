import {
  type AppearancePort,
  type AppearancePreference,
  type AppearanceSnapshot,
  isAppearancePreference,
  resolvedAppearance,
  type ResolvedAppearance,
} from "./appearance-port";

export const APPEARANCE_STORAGE_KEY = "personal-website.appearance/v1";
export const BROWSER_APPEARANCE_MARKER = "personal-website/browser-appearance-port/v1";

function reasonMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function systemAppearance(query: MediaQueryList): ResolvedAppearance {
  return query.matches ? "dark" : "light";
}

/** Create the only adapter allowed to touch localStorage, matchMedia, or html. */
export function createBrowserAppearancePort(target: Window): AppearancePort {
  const query = target.matchMedia("(prefers-color-scheme: dark)");
  let preference: AppearancePreference = "system";
  let error: string | null = null;
  try {
    const stored: unknown = target.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored !== null && isAppearancePreference(stored)) preference = stored;
  } catch (reason) {
    error = `Appearance could not read browser storage: ${reasonMessage(reason)}`;
  }

  let snapshot: AppearanceSnapshot = Object.freeze({
    error,
    preference,
    resolved: resolvedAppearance(preference, systemAppearance(query)),
  });
  let disposed = false;
  const listeners = new Set<() => void>();

  const publish = (next: AppearanceSnapshot): void => {
    snapshot = Object.freeze(next);
    target.document.documentElement.dataset.theme = snapshot.resolved;
    for (const listener of listeners) listener();
  };

  const onSystemChange = (): void => {
    if (disposed || snapshot.preference !== "system") return;
    publish({ ...snapshot, resolved: systemAppearance(query) });
  };

  query.addEventListener("change", onSystemChange);
  target.document.documentElement.dataset.appearanceAdapter = BROWSER_APPEARANCE_MARKER;
  target.document.documentElement.dataset.theme = snapshot.resolved;

  return Object.freeze({
    dispose: () => {
      if (disposed) return undefined;
      disposed = true;
      query.removeEventListener("change", onSystemChange);
      listeners.clear();
      delete target.document.documentElement.dataset.appearanceAdapter;
      return undefined;
    },
    getSnapshot: () => snapshot,
    setPreference: (nextPreference: AppearancePreference) => {
      if (disposed) return Object.freeze({ ok: false, error: "Appearance is disposed." });
      try {
        target.localStorage.setItem(APPEARANCE_STORAGE_KEY, nextPreference);
      } catch (reason) {
        const message = `Appearance could not write browser storage: ${reasonMessage(reason)}`;
        publish({ ...snapshot, error: message });
        return Object.freeze({ ok: false, error: message });
      }
      publish({
        error: null,
        preference: nextPreference,
        resolved: resolvedAppearance(nextPreference, systemAppearance(query)),
      });
      return Object.freeze({ ok: true });
    },
    subscribe: (listener: () => void) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}
