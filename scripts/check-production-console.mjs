import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const entryPoint = fileURLToPath(new URL('../src/index.js', import.meta.url))
const result = await build({
  entryPoints: [entryPoint],
  bundle: true,
  format: 'esm',
  minify: true,
  platform: 'browser',
  treeShaking: true,
  write: false
})

const source = new TextDecoder().decode(result.outputFiles[0].contents)
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const warnings = []
const errors = []
const originalWarn = console.warn
const originalError = console.error

console.warn = (...arguments_) => warnings.push(arguments_)
console.error = (...arguments_) => errors.push(arguments_)

try {
  const runtime = await import(moduleUrl)
  runtime.configure({ development: false })

  const count = runtime.signal(0)
  const doubled = runtime.computed(() => count.value * 2)
  const stop = runtime.effect(() => doubled.value)

  runtime.batch(() => {
    count.value = 1
    count.value = 2
  })

  if (doubled.value !== 4) {
    throw new Error('Production bundle smoke test produced an incorrect computed value')
  }

  stop()
  count.dispose()
} finally {
  console.warn = originalWarn
  console.error = originalError
}

if (warnings.length > 0 || errors.length > 0) {
  throw new Error(`Production bundle emitted console output: ${warnings.length} warning(s), ${errors.length} error(s)`)
}

console.log('Production bundle emitted no console.warn or console.error output')
