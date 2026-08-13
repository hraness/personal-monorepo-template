import { canonicalSiteOrigin } from "../src/site-url";
import { personalSite } from "../src/site";

export const siteOrigin = canonicalSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const publicSite = Object.freeze({
  canonicalUrl: siteOrigin,
  description: personalSite.introduction,
  name: personalSite.name,
});
