import type { MetadataRoute } from "next";

import { publicSite } from "./site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicSite.name,
    short_name: publicSite.name,
    description: publicSite.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fbfcfc",
    theme_color: "#fbfcfc",
  };
}
