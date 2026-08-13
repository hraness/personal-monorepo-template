import type { Metadata } from "next";

import { DesignGallery } from "../../src/design-gallery";

export const metadata: Metadata = {
  title: "design system",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignGallery />;
}
