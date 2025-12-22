# @hiogawa/vite-plugin-fullstack

A Vite plugin that provides a `?assets` import API for accessing build assets information in SSR environments.

```js
import assets from "./client.js?assets=client";

// assets.entry - Entry script URL
// assets.js    - JavaScript chunks to preload
// assets.css   - CSS files to include
```

> [!NOTE]
> This package implements the proposal available on [Vite discussion](https://github.com/vitejs/vite/discussions/20913).
> Please leave feedback there.

## Install

```sh
npm install @hiogawa/vite-plugin-fullstack
```

## Usage

```js
// vite.config.ts
import fullstack from "@hiogawa/vite-plugin-fullstack";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [fullstack()],
  environments: {
    client: {
      build: { outDir: "./dist/client" },
    },
    ssr: {
      build: {
        outDir: "./dist/ssr",
        emitAssets: true,
        rollupOptions: {
          input: { index: "./src/server.ts" },
        },
      },
    },
  },
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments["ssr"]!);
      await builder.build(builder.environments["client"]!);
    },
  },
});
```

```js
// src/server.ts
import clientAssets from "./client.ts?assets=client";

export default {
  fetch() {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          ${clientAssets.css.map((f) => `<link rel="stylesheet" href="${f.href}" />`).join("\n")}
          <script type="module" src="${clientAssets.entry}"></script>
        </head>
        <body>...</body>
      </html>`,
      { headers: { "content-type": "text/html" } },
    );
  },
};
```

### TypeScript

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@hiogawa/vite-plugin-fullstack/types"]
  }
}
```

## Examples

| Example                                    | Playground                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [Basic](./examples/basic/)                 | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/basic)         |
| [React Router](./examples/react-router/)   | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/react-router)  |
| [Vue Router](./examples/vue-router/)       | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/vue-router)    |
| [Preact Island](./examples/island/)        | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/island)        |
| [Remix](./examples/remix/)                 | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/remix)         |
| [Cloudflare](./examples/cloudflare/)       | -                                                                                                           |
| [Data Fetching](./examples/data-fetching/) | [StackBlitz](https://stackblitz.com/github/hi-ogawa/vite-plugin-fullstack/tree/main/examples/data-fetching) |

## Documentation

- [Proposal](./docs/PROPOSAL.md) - Full proposal with detailed API documentation
- [How It Works](./docs/HOW_IT_WORKS.md) - Internal architecture and implementation
