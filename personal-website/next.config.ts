import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hraness/ui"],
  typescript: {
    // CI sets this only in the build job; the parallel static job runs the
    // same `tsc --noEmit`, and Required needs both jobs.
    ignoreBuildErrors: process.env.PERSONAL_WEBSITE_TYPECHECKED === "1",
  },
};

export default nextConfig;
