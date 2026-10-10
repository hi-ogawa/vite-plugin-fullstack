import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  experimental: { bundledDev: mode === "bundled" },
  optimizeDeps: { exclude: ["vite/dist/client/client.mjs"] },
}));
