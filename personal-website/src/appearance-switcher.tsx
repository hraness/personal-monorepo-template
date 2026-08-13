"use client";

import { SegmentedControl } from "@hraness/ui";
import { useSyncExternalStore } from "react";

import type { AppearancePort, AppearancePreference } from "./appearance-port";

const items = [
  { id: "light", label: "light" },
  { id: "dark", label: "dark" },
  { id: "system", label: "system" },
] as const;

export function AppearanceSwitcher({ port }: Readonly<{ port: AppearancePort }>) {
  const snapshot = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );

  return (
    <div className="appearance-control">
      <SegmentedControl<AppearancePreference>
        aria-label="Appearance"
        items={items}
        onChange={(preference) => {
          port.setPreference(preference);
        }}
        size="compact"
        value={snapshot.preference}
      />
      <span className="appearance-error" role="status">
        {snapshot.error}
      </span>
    </div>
  );
}
