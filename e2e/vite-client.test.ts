import { fileURLToPath } from "node:url";
import assetsPlugin from "@hiogawa/vite-plugin-fullstack/assets";
import { expect, test } from "@playwright/test";
import { createServer, version } from "vite";

for (const bundledDev of [false, true]) {
  test(`Vite client and CSS (bundledDev=${bundledDev})`, async ({ page }) => {
    test.skip(bundledDev && Number(version.split(".")[0]) < 8);

    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    const server = await createServer({
      root: fileURLToPath(new URL("./fixtures/vite-client", import.meta.url)),
      mode: bundledDev ? "bundled" : "unbundled",
      logLevel: "warn",
      plugins: [assetsPlugin({ experimental: { clientBuildFallback: false } })],
    });

    try {
      await server.listen(0);
      const url = server.resolvedUrls!.local[0]!;
      await expect
        .poll(async () => (await page.request.get(url)).text(), {
          timeout: 15_000,
        })
        .toContain("<title>Vite client regression</title>");
      await page.goto(url);
      expect(errors).toEqual([]);
      await expect(page.getByRole("heading")).toHaveText("client loaded");
      await expect(page.getByRole("heading")).toHaveCSS(
        "color",
        "rgb(102, 51, 153)",
      );
      expect(errors).toEqual([]);
    } finally {
      await server.close();
    }
  });
}
