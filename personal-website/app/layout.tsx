import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { personalSite } from "../src/site";
import { READING_ATOM_PATH } from "./feeds/paths";
import "./globals.css";
import { OptionalPostHogAnalytics } from "./posthog-analytics";
import { publicSite } from "./site";

export const metadata: Metadata = {
  metadataBase: new URL(publicSite.canonicalUrl),
  applicationName: personalSite.name,
  title: personalSite.name,
  description: personalSite.introduction,
  alternates: {
    canonical: "/",
    types: {
      "application/atom+xml": [
        { title: `${personalSite.name}’s reading notes`, url: READING_ATOM_PATH },
      ],
    },
  },
  creator: personalSite.name,
  manifest: "/manifest.webmanifest",
  authors: [{ name: personalSite.name, url: "/" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "profile",
    url: "/",
    title: personalSite.name,
    description: personalSite.introduction,
    siteName: personalSite.name,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
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
