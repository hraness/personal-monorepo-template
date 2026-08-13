"use client";

import { Badge } from "@hraness/ui";
import { useSyncExternalStore } from "react";

import { AppearanceSwitcher } from "./appearance-switcher";
import { useProductionAppearance } from "./use-production-appearance";

export function DesignGallery() {
  const appearance = useProductionAppearance();
  const snapshot = useSyncExternalStore(
    appearance.subscribe,
    appearance.getSnapshot,
    appearance.getSnapshot,
  );

  return (
    <main className="design-gallery" data-theme={snapshot.resolved}>
      <header>
        {/* Shared with the Vite composition, so this product-neutral surface uses a native link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">home</a>
        <h1>design system</h1>
        <p>The public primitives and local composition used by this starter.</p>
      </header>

      <section aria-labelledby="tags-heading">
        <h2 id="tags-heading">tags</h2>
        <div className="design-row">
          <Badge>neutral</Badge>
          <Badge tone="info">info</Badge>
          <Badge tone="success">success</Badge>
        </div>
      </section>

      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">appearance</h2>
        <AppearanceSwitcher port={appearance} />
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading">text and links</h2>
        <p>
          Compact body text, <a href="https://example.com">a native link</a>, and
          the same semantic color roles as the personal index.
        </p>
      </section>
    </main>
  );
}
