import assert from "node:assert/strict";
import { toNodeHandler } from "srvx/node";
import { type Plugin, isRunnableDevEnvironment } from "vite";
import { type AssetsPluginOptions, assetsPlugin } from "../plugin";
import { getEntrySource } from "./utils";

export type FullstackPluginOptions = AssetsPluginOptions & {
  /**
   * @default true
   */
  serverHandler?: boolean;
};

export default function vitePluginFullstack(
  pluginOpts?: FullstackPluginOptions,
): Plugin[] {
  return [...serverHandlerPlugin(pluginOpts), ...assetsPlugin(pluginOpts)];
}

export function serverHandlerPlugin(
  pluginOpts?: FullstackPluginOptions,
): Plugin[] {
  return [
    {
      name: "fullstack:server-handler",
      apply: () => pluginOpts?.serverHandler !== false,
      config(userConfig, _env) {
        return {
          appType: userConfig.appType ?? "custom",
        };
      },
      configureServer(server) {
        const name = (pluginOpts?.serverEnvironments ?? ["ssr"])[0]!;
        const environment = server.environments[name]!;
        assert(isRunnableDevEnvironment(environment));
        const runner = environment.runner;
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              const source = getEntrySource(environment.config);
              const mod = await runner.import(source);
              req.url = req.originalUrl ?? req.url;
              await toNodeHandler(mod.default.fetch)(req, res);
            } catch (e) {
              next(e);
            }
          });
        };
      },
    },
  ];
}
