import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/assets.ts", "src/runtime.ts"],
  format: ["esm"],
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
  hooks: {
    async "build:done"() {
      fs.appendFileSync(
        "./dist/index.d.ts",
        `\nimport type {} from "@hiogawa/vite-plugin-fullstack/types";\n`,
      );
      // inline file content as raw string to allow downstream package `nitro` to bundle this plugin package
      const pluginChunk = fs
        .readdirSync("dist")
        .find((f) => f.startsWith("plugin-") && f.endsWith(".js"));
      if (pluginChunk) {
        const pluginPath = `dist/${pluginChunk}`;
        let pluginBundle = await readFile(pluginPath, "utf-8");
        await writeFile(
          pluginPath,
          pluginBundle.replace(
            `fs.readFileSync(path.join(import.meta.dirname, "runtime.js"), "utf-8")`,
            `\`${await readFile("dist/runtime.js", "utf-8")}\``,
          ),
        );
      }
    },
  },
}) as any;
