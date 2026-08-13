import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const directDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(directDirectory, "..");
const uiSourceEntry = resolve(process.cwd(), "node_modules/@hraness/ui/src/index.ts");

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@hraness\/ui$/u, replacement: uiSourceEntry }],
  },
  server: { open: "/direct/" },
  build: {
    emptyOutDir: true,
    outDir: "dist-direct",
    rollupOptions: { input: resolve(directDirectory, "index.html") },
    sourcemap: true,
  },
});
