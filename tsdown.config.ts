import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/assets.ts", "src/runtime.ts"],
  format: ["esm"],
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
  hooks: {
    "build:done"(ctx) {
      for (const filename of ["index.d.ts", "assets.d.ts"]) {
        fs.appendFileSync(
          path.join(ctx.options.outDir, filename),
          `\nimport type {} from "@hiogawa/vite-plugin-fullstack/types";\n`,
        );
      }
    },
  },
}) as any;
