import type { MetadataRoute } from "next";

import { publicSite } from "./site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${publicSite.canonicalUrl}/sitemap.xml`,
    host: publicSite.canonicalUrl,
  };
}
