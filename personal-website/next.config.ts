import type { NextConfig } from "next";
import { resolve } from "node:path";

// v0.2.0 ships source declarations alongside a Bun bundle whose retained
// module-level directives are not accepted by Next. Compile the public source.
const uiSourceEntry = resolve(process.cwd(), "node_modules/@hraness/ui/src/index.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hraness/ui"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@hraness/ui$": uiSourceEntry,
    };
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
