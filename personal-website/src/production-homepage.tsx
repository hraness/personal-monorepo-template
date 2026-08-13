"use client";

import { PersonalHomepage } from "./personal-homepage";
import type { PersonalSiteContent } from "./site";
import { useProductionAppearance } from "./use-production-appearance";

export function ProductionHomepage({ content }: Readonly<{ content: PersonalSiteContent }>) {
  const appearance = useProductionAppearance();

  return <PersonalHomepage appearance={appearance} content={content} />;
}
