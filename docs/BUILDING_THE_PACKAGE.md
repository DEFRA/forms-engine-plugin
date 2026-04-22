---
layout: default
title: Building the package
render_with_liquid: false
nav_order: 5
---

# Building the package

1. [Overview](#overview)
2. [Build steps](#build-steps)
3. [Path alias resolution](#path-alias-resolution)
4. [Packaging for npm](#packaging-for-npm)
5. [Package contents](#package-contents)

## Overview

The build pipeline compiles TypeScript and JavaScript source files into a publishable npm package. It produces server-side JavaScript, client-side bundles, TypeScript declaration files and a copy of the source files with resolved import paths.

To run the full build:

```shell
npm run build
```

This executes four steps in sequence: `build:server`, `build:client`, `build:types` and `build:src`.

## Build steps

### `build:server`

Compiles the server-side source code using [Babel](https://babeljs.io/). TypeScript and JavaScript files in `src/` are transpiled to JavaScript and output to `.server/`. Test files (`**/*.test.ts`) are excluded. Source maps are generated alongside each output file.

Babel is configured with `babel-plugin-module-resolver` which resolves the `~` path alias (see [Path alias resolution](#path-alias-resolution)) to relative paths in the compiled `.js` output.

### `build:client`

Bundles client-side JavaScript and stylesheets using [webpack](https://webpack.js.org/). The output is written to `.public/` (minified assets) and `.server/client/` (shared scripts and styles). The `NODE_ENV` defaults to `production`.

### `build:types`

Generates TypeScript declaration files (`.d.ts`) from the source and outputs them to `.server/`. This step runs two tools in sequence:

1. **`tsc`** compiles declarations using `tsconfig.build.json`. Because TypeScript preserves path aliases in its output, the generated `.d.ts` files initially contain unresolved `~` imports.
2. **`tsc-alias`** post-processes the `.d.ts` files using `tsconfig.alias.json` to replace the `~` path aliases with relative paths.

`tsconfig.alias.json` exists separately from `tsconfig.build.json` because the path mappings need to be adjusted for `tsc-alias` to work correctly. The build config has `rootDir: ./src` which strips the `src/` prefix from output paths. This means `tsc-alias` needs the mapping `~/src/* -> ./*` (rather than `~/* -> ./*`) so it can locate the target files within the `.server/` output directory.

### `build:src`

Runs `scripts/resolve-tilde-imports.js` which copies the `src/` directory to `.src/` and resolves all `~/src/...` import paths to relative paths in the copy. The original `src/` directory is left untouched.

This is necessary because the source files are shipped in the npm package (for source map support) and consumers cannot resolve the `~` path alias.

## Path alias resolution

During development, the codebase uses a `~` path alias as a shorthand for the project root. For example:

```typescript
import { config } from '~/src/config/index.js'
```

This alias is defined in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "~/*": ["./*"]
    }
  }
}
```

The `~` alias improves the developer experience by avoiding deeply nested relative paths like `../../../../config/index.js`. However, package consumers do not have this alias configured, so all `~` references must be resolved to relative paths before the package is published.

Three separate mechanisms handle this resolution across the different output types:

| Output              | Tool                               | Config                |
| ------------------- | ---------------------------------- | --------------------- |
| `.server/**/*.js`   | `babel-plugin-module-resolver`     | `babel.config.cjs`    |
| `.server/**/*.d.ts` | `tsc-alias`                        | `tsconfig.alias.json` |
| `.src/**/*.ts`      | `scripts/resolve-tilde-imports.js` | N/A                   |

## Packaging for npm

The `package.json` `files` field controls which directories are included in the published package:

```json
{
  "files": [".server", ".public", "src"]
}
```

Note that `src` is listed here (not `.src`). The `prepack` and `postpack` lifecycle scripts handle the swap:

1. **`prepack`** runs before `npm pack` or `npm publish`. It moves the original `src/` to `.src.bak/` and moves the resolved `.src/` into `src/`. This means npm packs the resolved copy under the `src` directory name.
2. **`postpack`** runs after packing completes. It restores the original `src/` and moves the resolved copy back to `.src/`.

This swap approach avoids destructive operations on the working `src/` directory. At no point are the original source files modified.

### Build and publish workflow

```shell
npm run build    # Produces .server/, .public/ and .src/
npm pack         # prepack swaps .src -> src, packs, postpack restores
```

Or equivalently:

```shell
npm run build
npm publish
```

## Package contents

The published package contains:

| Directory  | Contents                                                                             |
| ---------- | ------------------------------------------------------------------------------------ |
| `.server/` | Compiled JavaScript (`.js`), declaration files (`.d.ts`) and source maps (`.js.map`) |
| `.public/` | Minified client-side assets                                                          |
| `src/`     | TypeScript and JavaScript source files with resolved import paths                    |
