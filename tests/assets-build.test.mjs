import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createBuilder } from "vite";
import assetsPlugin from "../dist/assets.js";

for (const cssCodeSplit of [true, false]) {
  test(`multi-environment build emits usable assets (cssCodeSplit=${cssCodeSplit})`, async () => {
    const root = await realpath(
      await mkdtemp(path.join(tmpdir(), "fullstack-build-")),
    );
    try {
      await writeFile(
        path.join(root, "entry.js"),
        'import "./client.css"; export const entry = "client";',
      );
      await writeFile(path.join(root, "client.css"), ".client { color: red }");
      await writeFile(path.join(root, "server.css"), ".server { color: blue }");
      await writeFile(
        path.join(root, "server.js"),
        'import "./server.css"; import assets from "./entry.js?assets=client"; export default assets;',
      );
      const builder = await createBuilder({
        configFile: false,
        root,
        logLevel: "error",
        base: "/base/",
        plugins: assetsPlugin(),
        build: { sourcemap: true, minify: false, cssCodeSplit },
        environments: {
          client: { build: { outDir: path.join(root, "client") } },
          ssr: {
            build: {
              outDir: path.join(root, "ssr"),
              rollupOptions: { input: path.join(root, "server.js") },
            },
          },
        },
        builder: {
          async buildApp(builder) {
            await builder.build(builder.environments.ssr);
            await builder.build(builder.environments.client);
            await builder.writeAssetsManifest();
          },
        },
      });
      await builder.buildApp();
      const source = await readFile(
        path.join(root, "ssr/__fullstack_assets_manifest.js"),
        "utf8",
      );
      const manifest = JSON.parse(
        source.replace(/^export default /, "").replace(/;$/, ""),
      );
      const entry = manifest.client["entry.js"];
      assert.ok(entry.entry.endsWith(".js"));
      assert.ok(entry.js.some(({ href }) => href === entry.entry));
      assert.equal(entry.css.length, 1);
      for (const { href } of [...entry.js, ...entry.css]) {
        assert.ok(href.startsWith("/base/"));
        const bytes = await readFile(
          path.join(root, "client", href.slice("/base/".length)),
          "utf8",
        );
        if (href.endsWith(".css")) assert.match(bytes, /color: red/);
        if (href.endsWith(".js")) {
          const map = JSON.parse(
            await readFile(
              path.join(root, "client", href.slice("/base/".length) + ".map"),
              "utf8",
            ),
          );
          assert.equal(map.version, 3);
          assert.ok(map.sources.some((source) => source.endsWith("entry.js")));
        }
      }
      const serverAssets = await readdir(path.join(root, "ssr/assets"));
      const css = serverAssets.find((file) => file.endsWith(".css"));
      assert.ok(css);
      assert.deepEqual(
        await readFile(path.join(root, "client/assets", css)),
        await readFile(path.join(root, "ssr/assets", css)),
      );
      assert.match(
        await readFile(path.join(root, "client/assets", css), "utf8"),
        /color:\s*(?:blue|#00f)\b/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
