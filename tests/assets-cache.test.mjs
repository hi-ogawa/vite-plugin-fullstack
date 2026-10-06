import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import assetsPlugin from "../dist/assets.js";

async function collected(ref) {
  for (let i = 0; i < 8; i++) {
    await new Promise(setImmediate);
    globalThis.gc();
    if (!ref.deref()) return true;
  }
  return false;
}

for (const cssCodeSplit of [true, false]) {
  test(`manifest cache is detached (cssCodeSplit=${cssCodeSplit})`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "fullstack-assets-"));
    try {
      const clientOut = path.join(root, "client");
      const serverOut = path.join(root, "ssr");
      await mkdir(clientOut);
      await mkdir(serverOut);
      await writeFile(path.join(serverOut, "server.css"), ".server {}");
      await writeFile(path.join(serverOut, "image.svg"), "<svg/>");
      const config = {
        root,
        base: "/base/",
        logger: { error: (message) => assert.fail(message) },
      };
      const plugins = assetsPlugin();
      const plugin = plugins[0];
      plugin.configResolved(config);
      const builder = {
        config,
        environments: {
          client: { config: { build: { outDir: clientOut, cssCodeSplit } } },
          ssr: { config: { build: { outDir: serverOut, cssCodeSplit } } },
        },
      };
      await plugin.buildApp.handler(builder);
      const id = path.join(root, "entry.js");
      await plugin.load.handler.call(
        {
          environment: { name: "ssr", mode: "build" },
          resolve: async () => ({ id }),
        },
        "\0virtual:fullstack/assets?import=entry.js&environment=client",
      );
      let graph = { marker: "completed graph" };
      const ref = new WeakRef(graph);
      function chunk(fileName, moduleIds, imports, css, capturedGraph) {
        return {
          type: "chunk",
          fileName,
          moduleIds,
          imports,
          ...(css && { viteMetadata: { importedCss: new Set(css) } }),
          get code() {
            throw new Error("Must not read code");
          },
          map: { toUrl: () => capturedGraph },
          modules: { capturedGraph },
        };
      }
      let bundle = {
        "entry.js": chunk(
          "entry.js",
          [id],
          ["dep.js", "no-css.js", "external"],
          ["entry.css"],
          graph,
        ),
        "dep.js": chunk(
          "dep.js",
          [path.join(root, "dep.js")],
          ["entry.js"],
          ["dep.css", "entry.css"],
          graph,
        ),
        "no-css.js": chunk("no-css.js", [], [], undefined, graph),
        "single.css": {
          type: "asset",
          fileName: "single.css",
          originalFileNames: ["style.css"],
          get source() {
            throw new Error("Must not read source");
          },
        },
      };
      plugin.writeBundle.call({ environment: { name: "client" } }, {}, bundle);
      plugin.writeBundle.call(
        { environment: { name: "ssr" } },
        {},
        {
          "server.css": {
            type: "asset",
            fileName: "server.css",
            originalFileNames: ["server.css"],
          },
          "image.svg": {
            type: "asset",
            fileName: "image.svg",
            originalFileNames: ["image.svg"],
          },
        },
      );
      assert.equal(bundle["entry.js"].map.toUrl(), graph);
      assert.equal(bundle["entry.js"].modules.capturedGraph, graph);
      assert.deepEqual(bundle["entry.js"].moduleIds, [id]);
      assert.deepEqual(bundle["entry.js"].imports, [
        "dep.js",
        "no-css.js",
        "external",
      ]);
      assert.deepEqual(
        [...bundle["entry.js"].viteMetadata.importedCss],
        ["entry.css"],
      );
      assert.deepEqual(bundle["single.css"].originalFileNames, ["style.css"]);
      bundle["entry.js"].moduleIds.length = 0;
      bundle["entry.js"].imports.length = 0;
      bundle["entry.js"].viteMetadata.importedCss.clear();
      bundle["single.css"].originalFileNames.length = 0;
      bundle = null;
      graph = null;
      assert.equal(
        await collected(ref),
        true,
        "cache must not retain output callbacks",
      );
      await builder.writeAssetsManifest();
      const source = await readFile(
        path.join(serverOut, "__fullstack_assets_manifest.js"),
        "utf8",
      );
      const manifest = JSON.parse(
        source.replace(/^export default /, "").replace(/;$/, ""),
      );
      assert.deepEqual(manifest, {
        client: {
          "entry.js": {
            entry: "/base/entry.js",
            js: ["entry.js", "dep.js", "no-css.js"].map((file) => ({
              href: `/base/${file}`,
            })),
            css: [
              "entry.css",
              "dep.css",
              ...(!cssCodeSplit ? ["single.css"] : []),
            ].map((file) => ({ href: `/base/${file}` })),
          },
        },
      });
      assert.equal(
        await readFile(path.join(clientOut, "server.css"), "utf8"),
        ".server {}",
      );
      assert.equal(
        await readFile(path.join(clientOut, "image.svg"), "utf8"),
        "<svg/>",
      );
      assert.equal(
        plugins[0],
        plugin,
        "keep the manifest-owning plugin alive through collection",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
