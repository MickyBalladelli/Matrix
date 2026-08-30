import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const source = `
import { batch, computed, effect, signal } from './src/index.js'

const sourceSignal = signal(0)
const derived = computed(() => sourceSignal.value + 1)
const stop = effect(() => derived.value)

batch(() => {
  sourceSignal.value = 1
  sourceSignal.value = 2
})

stop()
sourceSignal.dispose()
`

const result = spawnSync(process.execPath, [
  '--throw-deprecation',
  '--input-type=module',
  '--eval',
  source
], {
  cwd: root,
  encoding: 'utf8'
})

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  throw new Error(`Node deprecation check failed:\n${result.stderr || result.stdout}`)
}

if (/DeprecationWarning|\[DEP\d+\]/.test(result.stderr)) {
  throw new Error(`Node emitted a deprecation warning:\n${result.stderr}`)
}

console.log(`Node deprecation check passed on ${process.version}`)
