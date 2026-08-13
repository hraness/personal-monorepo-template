import type {
  AppearancePort,
  AppearancePreference,
  AppearanceSnapshot,
} from "../src/appearance-port";
import type { WebsiteDirectAppearance } from "./world";

export const DETERMINISTIC_APPEARANCE_MARKER = "personal-website/deterministic-appearance-port/v1";

export interface DeterministicAppearancePort extends AppearancePort {
  readonly isDisposed: () => boolean;
}

export function createDeterministicAppearancePort(options: Readonly<{
  appearance: WebsiteDirectAppearance;
  signal: AbortSignal;
}>): DeterministicAppearancePort {
  let snapshot: AppearanceSnapshot = Object.freeze({
    error: null,
    preference: options.appearance.preference,
    resolved: options.appearance.resolved,
  });
  const systemResolved = options.appearance.resolved;
  let disposed = false;
  const listeners = new Set<() => void>();

  const publish = (next: AppearanceSnapshot): void => {
    snapshot = Object.freeze(next);
    for (const listener of listeners) listener();
  };

  return Object.freeze({
    dispose: () => {
      disposed = true;
      listeners.clear();
      return undefined;
    },
    getSnapshot: () => snapshot,
    isDisposed: () => disposed,
    setPreference: (preference: AppearancePreference) => {
      if (disposed || options.signal.aborted) {
        return Object.freeze({ ok: false, error: "Appearance is disposed." });
      }
      if (options.appearance.writeFailure !== null) {
        publish({ ...snapshot, error: options.appearance.writeFailure });
        return Object.freeze({ ok: false, error: options.appearance.writeFailure });
      }
      publish({
        error: null,
        preference,
        resolved: preference === "system" ? systemResolved : preference,
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
