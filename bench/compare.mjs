import { chromium } from '@playwright/test'
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const iterations = Number(process.env.MATRIX_COMPARE_ITERATIONS ?? 100)
const definitions = [
  { name: 'Matrix', entry: 'bench/comparison/matrix.js', globalName: 'MatrixComparison' },
  { name: 'React', packageName: 'react', entry: 'bench/comparison/react.js', globalName: 'ReactComparison' },
  { name: 'Vue', packageName: 'vue', entry: 'bench/comparison/vue.js', globalName: 'VueComparison' },
  { name: 'Preact', packageName: 'preact', entry: 'bench/comparison/preact.js', globalName: 'PreactComparison' }
]

const available = []
const skipped = []

for (const definition of definitions) {
  if (definition.packageName) {
    try {
      await import(definition.packageName)
    } catch {
      skipped.push({ name: definition.name, reason: `Install ${definition.packageName} to include it` })
      continue
    }
  }

  const result = await build({
    entryPoints: [resolve(root, definition.entry)],
    bundle: true,
    format: 'iife',
    globalName: definition.globalName,
    platform: 'browser',
    sourcemap: false,
    write: false
  })
  const code = new TextDecoder().decode(result.outputFiles[0].contents)
  available.push({ ...definition, code })
}

let browser
try {
  browser = await chromium.launch()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/Executable doesn't exist|executable.*not found/i.test(message)) {
    throw new Error('Playwright chromium is not installed. Run: npx playwright install chromium')
  }
  throw error
}
const results = []

try {
  for (const definition of available) {
    const page = await browser.newPage()
    try {
      const safeCode = definition.code.replaceAll('</script', '<\\/script')
      await page.setContent(`<!doctype html><div id="comparison-root"></div><script>${safeCode}</script>`)
      const result = await page.evaluate(async ({ globalName, iterations }) => {
        const adapterFactory = globalThis[globalName]
        if (!adapterFactory?.createAdapter) {
          throw new Error(`Comparison adapter ${globalName} did not load`)
        }

        const root = document.querySelector('#comparison-root')
        const mountStart = performance.now()
        const adapter = adapterFactory.createAdapter(root)
        const mountMilliseconds = performance.now() - mountStart
        const updateStart = performance.now()
        await adapter.update(iterations)
        const updateMilliseconds = performance.now() - updateStart
        const unmountStart = performance.now()
        await adapter.dispose()
        const unmountMilliseconds = performance.now() - unmountStart

        return {
          mountMilliseconds: Number(mountMilliseconds.toFixed(3)),
          updateMilliseconds: Number(updateMilliseconds.toFixed(3)),
          unmountMilliseconds: Number(unmountMilliseconds.toFixed(3)),
          finalText: root.textContent
        }
      }, { globalName: definition.globalName, iterations })
      results.push({ framework: definition.name, ...result })
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}

const packageVersion = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version
console.log(JSON.stringify({
  protocol: 'single button mount, 100 synchronous state updates, and unmount',
  iterations,
  matrixVersion: packageVersion,
  results,
  skipped,
  note: 'Compare repeated runs on the same machine and browser. This is directional data, not a cross-machine score.'
}, null, 2))
