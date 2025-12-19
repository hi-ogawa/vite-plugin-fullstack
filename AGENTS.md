# AI Agents Guide

This document provides guidance for AI agents and developers using AI-assisted tools when contributing to the `@hiogawa/vite-plugin-fullstack` project.

## Project Overview

This project implements a Vite plugin that provides a `?assets` query import API for accessing build assets information in SSR (Server-Side Rendering) applications. The plugin enables framework-agnostic solutions for asset preloading and FOUC (Flash of Unstyled Content) prevention.

## Key Architecture

- **Query Import System**: Provides `?assets`, `?assets=client`, and `?assets=ssr` imports
- **Virtual Module System**: Resolves asset imports to virtual modules
- **Dev vs Build Mode**: Different behavior for development (CSS collection via module graph) and production (static manifest generation)
- **HMR Support**: Custom hot module replacement handling for SSR-injected CSS

For detailed architecture, see [HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

## Development Guidelines

### Build System

- **Build Tool**: Uses `tsdown` for building TypeScript
- **Package Manager**: pnpm (version specified in `packageManager` field)
- **Node Version**: Managed via Volta (see `package.json`)

### Commands

```bash
# Development
pnpm dev              # Watch mode with sourcemaps

# Build
pnpm build            # Production build
pnpm prepack          # Clean build for publishing

# Testing
pnpm test-e2e         # Run Playwright E2E tests
pnpm tsc              # Type check all projects

# Code Quality
pnpm lint             # Format and lint with Biome
pnpm lint-check       # Check without modifications
```

### Code Style

- **Linter**: Biome (configuration in `biome.json`)
- **TypeScript**: Strict configuration (`@tsconfig/strictest`)
- Always run `pnpm lint` before committing

### Testing

- **E2E Tests**: Located in `e2e/` directory using Playwright
- **Examples**: Multiple example projects in `examples/` directory serve as integration tests
- Test coverage includes:
  - Basic SSR functionality
  - React Router integration
  - Vue Router integration  
  - Island architecture
  - Data fetching patterns

### Key Files to Understand

1. **`src/`** - Core plugin implementation
   - Asset query handling
   - Virtual module resolution
   - Manifest generation
   - HMR patching

2. **`types/`** - TypeScript type definitions for `?assets` imports

3. **`examples/`** - Reference implementations:
   - `basic/` - Simple SSR setup
   - `react-router/` - React Router integration
   - `vue-router/` - Vue Router + SSG
   - `island/` - Preact Island architecture
   - `data-fetching/` - RPC-style data fetching
   - `cloudflare/` - Cloudflare Workers deployment

## Making Changes

### When Working on Core Plugin

1. Understand the dual mode behavior (dev vs build)
2. Test changes in both development and production builds
3. Verify HMR still works correctly
4. Run E2E tests to ensure no regressions

### When Adding Features

1. Consider both client and server environments
2. Update TypeScript types if adding new APIs
3. Add examples demonstrating the feature
4. Update documentation (README.md and/or HOW_IT_WORKS.md)

### When Fixing Bugs

1. Identify if the bug is dev-only, build-only, or affects both
2. Add a test case reproducing the issue
3. Verify the fix doesn't break existing examples
4. Consider edge cases (multiple environments, different configs)

## Common Patterns

### Asset Collection

The plugin collects assets differently based on environment:

- **Client environment**: Returns empty assets (client doesn't need this)
- **SSR environment**: 
  - Dev mode: Traverse module graph to collect CSS
  - Build mode: Use generated manifest

### Virtual Modules

The plugin uses virtual modules extensively:

- `virtual:fullstack/assets-manifest` - Asset manifest reference
- `\0virtual:fullstack/empty-assets` - Empty assets for client

### Build Order

The plugin requires "SSR → Client" build order to support dynamically adding client entries based on server imports.

## Debugging Tips

1. **Dev Mode Issues**:
   - Check module graph traversal in CSS collection
   - Verify virtual module resolution
   - Inspect HMR behavior in browser DevTools

2. **Build Mode Issues**:
   - Check manifest generation in `dist/` folders
   - Verify asset copying between environments
   - Inspect bundled output for virtual module rewrites

3. **Type Issues**:
   - Ensure `types/` directory exports are correct
   - Check ambient type declarations
   - Verify `tsconfig.json` includes proper references

## Testing Strategy

1. **Unit-level**: Core logic should be testable in isolation
2. **Integration**: Examples serve as integration tests
3. **E2E**: Playwright tests verify end-to-end functionality
4. **Manual**: Test in real browser for HMR and asset loading

## Documentation

- **README.md**: High-level API documentation and proposal
- **HOW_IT_WORKS.md**: Internal architecture and implementation details
- **CHANGELOG.md**: Version history and breaking changes
- **This file (AGENTS.md)**: Development guidelines for contributors

## Common Pitfalls

1. **CSS Duplication**: Each environment builds its own CSS - be aware of potential inconsistencies
2. **Dev vs Build Differences**: `?assets=client` doesn't provide `css` during dev due to unbundled mode
3. **Circular Dependencies**: Avoid importing `?assets` from files that reference themselves
4. **Build Order**: Always build SSR before client in production

## Resources

- [Vite Plugin API](https://vite.dev/guide/api-plugin.html)
- [Vite Environment API](https://vite.dev/guide/api-environment.html)
- [Proposal Discussion](https://github.com/vitejs/vite/discussions/20913)

## Getting Help

- Check existing examples in `examples/` directory
- Review E2E tests in `e2e/` directory
- Read [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) for implementation details
- See [README.md](./README.md) for API usage patterns
