import { build } from 'esbuild'

await build({
  entryPoints: ['app.jsx'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  jsxImportSource: '@mickyballadelli/matrix',
  outfile: 'dist/app.js'
})
