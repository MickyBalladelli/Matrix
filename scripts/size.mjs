import { brotliCompressSync, gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const entries = {
  root: '../src/index.js',
  reactivity: '../src/reactivity/index.js',
  components: '../src/components/index.js',
  dom: '../src/dom/index.js',
  'jsx-runtime': '../src/jsx-runtime.js',
  styles: '../src/styles/index.js',
  utils: '../src/utils/index.js',
  plugins: '../src/plugins.js'
}

const brotliBudgets = {
  root: 16000,
  reactivity: 4000,
  components: 2000,
  dom: 11000,
  'jsx-runtime': 12000,
  styles: 5000,
  utils: 7000,
  plugins: 1500
}
const budgetTolerance = 0.02

const measurements = {}

for (const [name, relativeEntry] of Object.entries(entries)) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(relativeEntry, import.meta.url))],
    bundle: true,
    format: 'esm',
    minify: true,
    platform: 'browser',
    treeShaking: true,
    write: false
  })

  const source = result.outputFiles[0].contents
  measurements[name] = {
    minifiedBytes: source.length,
    gzipBytes: gzipSync(source).length,
    brotliBytes: brotliCompressSync(source).length,
    brotliBudget: brotliBudgets[name],
    budgetTolerance,
    brotliLimit: Math.ceil(brotliBudgets[name] * (1 + budgetTolerance))
  }
}

console.log(JSON.stringify(measurements, null, 2))

const failures = Object.entries(measurements)
  .filter(([, measurement]) => measurement.brotliBytes > measurement.brotliLimit)

if (failures.length > 0) {
  throw new Error(`Matrix size budget exceeded: ${failures.map(([name]) => name).join(', ')}`)
}
