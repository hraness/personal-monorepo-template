import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { canonicalSiteOrigin } from "../src/site-url";
import { personalSite } from "../src/site";
import "./globals.css";
import { OptionalPostHogAnalytics } from "./posthog-analytics";

const siteOrigin = canonicalSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: personalSite.name,
  description: personalSite.introduction,
  alternates: { canonical: "/" },
  creator: personalSite.name,
  openGraph: {
    type: "profile",
    url: "/",
    title: personalSite.name,
    description: personalSite.introduction,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#fbfcfc", media: "(prefers-color-scheme: light)" },
    { color: "#17191a", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <OptionalPostHogAnalytics />
        {children}
      </body>
    </html>
  );
}
