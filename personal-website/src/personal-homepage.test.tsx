import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createMemoryAppearancePort } from "./appearance-port";
import { PersonalHomepage } from "./personal-homepage";
import { personalSite } from "./site";

describe("personal homepage chrome", () => {
  test("uses the shared quiet-site landmarks, social icons, and appearance icons", () => {
    const appearance = createMemoryAppearancePort({
      preference: "system",
      resolved: "light",
    });
    const markup = renderToStaticMarkup(
      <PersonalHomepage appearance={appearance} content={personalSite} />,
    );
    appearance.dispose();

    expect(markup).toContain('data-slot="quiet-site-page"');
    expect(markup).toContain('data-slot="quiet-site-footer"');
    for (const link of personalSite.socialLinks) {
      expect(markup).toContain(`data-social-icon="${link.id}"`);
      expect(markup).toContain(`<span>${link.label}</span></a>`);
    }
    expect(markup).toContain('data-appearance-icon="light"');
    expect(markup).toContain('data-appearance-icon="dark"');
    expect(markup).toContain('data-appearance-icon="system"');
    expect(markup).not.toContain("Hraness");
  });
});
