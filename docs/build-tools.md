# Build tool integration

Matrix is an ESM package with an optional automatic JSX runtime. A build tool only needs to do two things:

1. Preserve or bundle ESM imports from `@mickyballadelli/matrix`.
2. Transform JSX with `jsxImportSource: '@mickyballadelli/matrix'` when the application uses `.jsx` or `.tsx`.

The tagged-template API needs no JSX transform.

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

## Package and runtime rules

- Import public entry points such as `@mickyballadelli/matrix` or `@mickyballadelli/matrix/reactivity`; do not import `src` paths in an application.
- Keep one Matrix copy in the bundle. Use the bundler's dedupe or alias feature when workspaces and published dependencies overlap.
- Build for a browser ESM target. SSR and hydration are not provided by this alpha.
- Do not mark Matrix as external unless the browser can resolve its ESM export at runtime.
- Serve the output over HTTP during development when relative module imports are involved; `file://` can block them.
