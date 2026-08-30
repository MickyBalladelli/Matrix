# Build tool integration

Matrix is an ESM package with an optional automatic JSX runtime. A build tool only needs to do two things:

1. Preserve or bundle ESM imports from `@mickyballadelli/matrix`.
2. Transform JSX with `jsxImportSource: '@mickyballadelli/matrix'` when the application uses `.jsx` or `.tsx`.

The tagged-template API needs no JSX transform.

The complete local examples are in `examples/build-tools`. Check the public
entry imports and the repository's esbuild JSX transform with:

```bash
npm run test:build:integrations
```

## Vite

For current Vite projects, start with the generated app configuration:

```js
import { defineConfig } from 'vite'

const matrixJsx = {
  runtime: 'automatic',
  importSource: '@mickyballadelli/matrix'
}

export default defineConfig({
  oxc: {
    jsx: matrixJsx
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        jsx: matrixJsx
      }
    }
  },
  resolve: {
    dedupe: ['@mickyballadelli/matrix']
  }
})
```

For a Vite version using esbuild JSX options, use:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@mickyballadelli/matrix'
  },
  resolve: {
    dedupe: ['@mickyballadelli/matrix']
  }
})
```

## esbuild

The CLI form is enough for a small app:

```bash
npx esbuild src/main.jsx \
  --bundle \
  --format=esm \
  --platform=browser \
  --jsx=automatic \
  --jsx-import-source=@mickyballadelli/matrix \
  --outfile=dist/app.js
```

The JavaScript API uses camelCase options:

```js
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  jsxImportSource: '@mickyballadelli/matrix',
  outfile: 'dist/app.js'
})
```

## Rollup

Rollup can bundle Matrix directly. Add the JSX transform plugin used by the application; the exact plugin is a project choice. With a Babel transform, configure the automatic runtime like this:

```js
import babel from '@rollup/plugin-babel'
import { defineConfig } from 'rollup'

export default defineConfig({
  input: 'src/main.jsx',
  output: {
    dir: 'dist',
    format: 'es'
  },
  plugins: [babel({
    babelHelpers: 'bundled',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    presets: [[
      '@babel/preset-react',
      { runtime: 'automatic', importSource: '@mickyballadelli/matrix' }
    ]]
  })]
})
```

If Rollup is only bundling `.js` files that use `html`, no JSX plugin is needed.

For an ESM application that imports only a few Matrix APIs, use the example
plugin in `examples/build-tools/rollup/matrix-tree-shake.mjs` with Rollup's
tree-shaker:

```js
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import { matrixTreeShake } from './matrix-tree-shake.mjs'

export default defineConfig({
  input: 'app.js',
  output: { dir: 'dist', format: 'es' },
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false
  },
  plugins: [nodeResolve(), matrixTreeShake()]
})
```

The plugin marks Matrix package modules as side-effect free after resolution;
unused exports then disappear from the bundle. Keep imports on public package
entry points so package export maps and deduplication continue to work.

## Webpack

Use the Babel loader for `.jsx` or `.tsx` and keep Matrix's import source in the preset:

```js
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

const config = {
  mode: 'production',
  entry: './src/main.jsx',
  output: {
    filename: 'app.js',
    path: path.resolve(root, 'dist')
  },
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [[
            '@babel/preset-react',
            { runtime: 'automatic', importSource: '@mickyballadelli/matrix' }
          ]]
        }
      }
    }]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
}

export default config
```

### Webpack 5 Module Federation

Share one Matrix runtime across the host and remotes. The example at
`examples/build-tools/webpack/webpack.config.mjs` uses:

```js
new ModuleFederationPlugin({
  name: 'matrixHost',
  shared: {
    '@mickyballadelli/matrix': {
      singleton: true,
      requiredVersion: false
    }
  }
})
```

Do not load separate Matrix copies in a remote. A singleton keeps Signals,
plugins, and component identity on one runtime graph.

## Next.js App Router

Keep Matrix DOM mounting in a `'use client'` component. The server page may
render that component, but `mount()` must run from a browser effect after a
ref exists. Set `transpilePackages: ['@mickyballadelli/matrix']` when the Next
toolchain needs to transpile the package. See
`examples/build-tools/next/app/MatrixCounter.jsx`.

## Astro

Astro can keep the page static and load Matrix in a client module script. Put
the mount point in the `.astro` page, import Matrix from the public package,
and create the view inside the script. See
`examples/build-tools/astro/src/pages/index.astro`.

## Remix

With Remix Vite, keep Matrix mounting inside a client-side React effect and
dispose the returned handle on cleanup. The route can be server-rendered
around that client boundary. See
`examples/build-tools/remix/app/routes/_index.jsx` and
`examples/build-tools/remix/vite.config.js`.

## Package and runtime rules

- Import public entry points such as `@mickyballadelli/matrix` or `@mickyballadelli/matrix/reactivity`; do not import `src` paths in an application.
- Keep one Matrix copy in the bundle. Use the bundler's dedupe or alias feature when workspaces and published dependencies overlap.
- Build for a browser ESM target. SSR and hydration are not provided by this alpha.
- Next.js, Astro, and Remix integrations must keep DOM APIs in client-only code.
- When using Module Federation, configure Matrix as a singleton shared dependency.
- Do not mark Matrix as external unless the browser can resolve its ESM export at runtime.
- Serve the output over HTTP during development when relative module imports are involved; `file://` can block them.
