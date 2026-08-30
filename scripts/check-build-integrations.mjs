import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const requiredFiles = [
  'examples/build-tools/esbuild/build.mjs',
  'examples/build-tools/rollup/rollup.config.mjs',
  'examples/build-tools/webpack/webpack.config.mjs',
  'examples/build-tools/next/app/MatrixCounter.jsx',
  'examples/build-tools/astro/src/pages/index.astro',
  'examples/build-tools/remix/app/routes/_index.jsx'
]
const publicImportFiles = [
  'examples/build-tools/esbuild/build.mjs',
  'examples/build-tools/esbuild/app.jsx',
  'examples/build-tools/rollup/app.js',
  'examples/build-tools/webpack/app.jsx',
  'examples/build-tools/webpack/webpack.config.mjs',
  'examples/build-tools/next/app/MatrixCounter.jsx',
  'examples/build-tools/astro/src/pages/index.astro',
  'examples/build-tools/remix/app/routes/_index.jsx'
]

for (const relativeFile of requiredFiles) {
  await readFile(resolve(root, relativeFile), 'utf8')
}

for (const relativeFile of publicImportFiles) {
  const source = await readFile(resolve(root, relativeFile), 'utf8')
  if (!source.includes('@mickyballadelli/matrix')) {
    throw new Error(`Build integration does not import Matrix publicly: ${relativeFile}`)
  }
}

const result = await build({
  stdin: {
    contents: `
      import { jsx } from '@mickyballadelli/matrix/jsx-runtime'
      export const view = jsx('button', { children: 'esbuild' })
    `,
    loader: 'jsx',
    resolveDir: root,
    sourcefile: 'matrix-build-compat.jsx'
  },
  bundle: false,
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: '@mickyballadelli/matrix',
  write: false
})
const output = new TextDecoder().decode(result.outputFiles[0].contents)
if (!output.includes('@mickyballadelli/matrix/jsx-runtime')) {
  throw new Error('esbuild did not preserve Matrix automatic JSX runtime imports')
}

console.log(`Build integration examples checked (${requiredFiles.length} adapters, esbuild JSX verified)`)
