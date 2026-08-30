# Matrix build-tool examples

These examples show the smallest integration boundary for each tool. Matrix
must be imported from its public package entry point. JSX builds use the
automatic runtime with `@mickyballadelli/matrix/jsx-runtime`.

## Local verification

From the repository root:

```bash
npm run test:build:integrations
```

That check verifies the JSX transform with the repository's esbuild and checks
that every integration example contains its required tool boundary. The full
tool examples require their own tool installation.

## Examples

- `esbuild`: JavaScript API build with automatic JSX.
- `rollup`: ESM build with a small Matrix tree-shaking plugin and explicit
  `treeshake` settings.
- `webpack`: Webpack 5 Babel build with Module Federation sharing one Matrix
  runtime.
- `next`: App Router page with a Client Component boundary around Matrix DOM
  mounting.
- `astro`: Astro page with a browser-only module script.
- `remix`: Remix Vite route with a Client Component boundary around Matrix DOM
  mounting.

For Next, Astro, and Remix, copy the example files into a fresh application
created by the tool's official starter. Do not mount Matrix during server
rendering; create the view after the browser component or module script runs.
