export const APPEARANCE_PREFERENCES = ["light", "dark", "system"] as const;

export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];
export type ResolvedAppearance = Exclude<AppearancePreference, "system">;

export interface AppearanceSnapshot {
  readonly error: string | null;
  readonly preference: AppearancePreference;
  readonly resolved: ResolvedAppearance;
}

export type AppearanceResult =
  | Readonly<{ ok: true }>
  | Readonly<{ error: string; ok: false }>;

/**
 * Product-owned boundary around appearance state. Browser storage, media
 * queries, and document mutation belong in the production adapter.
 */
export interface AppearancePort {
  readonly dispose: () => undefined;
  readonly getSnapshot: () => AppearanceSnapshot;
  readonly setPreference: (preference: AppearancePreference) => AppearanceResult;
  readonly subscribe: (listener: () => void) => () => void;
}

export function isAppearancePreference(input: unknown): input is AppearancePreference {
  return APPEARANCE_PREFERENCES.some((preference) => preference === input);
}

export function resolvedAppearance(
  preference: AppearancePreference,
  system: ResolvedAppearance,
): ResolvedAppearance {
  return preference === "system" ? system : preference;
}

export function createMemoryAppearancePort(
  initial: Readonly<{
    error?: string | null;
    preference: AppearancePreference;
    resolved: ResolvedAppearance;
  }>,
): AppearancePort {
  let snapshot: AppearanceSnapshot = Object.freeze({
    error: initial.error ?? null,
    preference: initial.preference,
    resolved: initial.resolved,
  });
  let disposed = false;
  const listeners = new Set<() => void>();

  return Object.freeze({
    dispose: () => {
      disposed = true;
      listeners.clear();
      return undefined;
    },
    getSnapshot: () => snapshot,
    setPreference: (preference: AppearancePreference) => {
      if (disposed) return Object.freeze({ ok: false, error: "Appearance is disposed." });
      snapshot = Object.freeze({
        error: null,
        preference,
        resolved: preference === "system" ? snapshot.resolved : preference,
      });
      for (const listener of listeners) listener();
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
