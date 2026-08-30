import { batch, computed, effect, signal } from '../../src/index.js'

export function runRuntimeChecks() {
  const source = signal(2)
  let computedRuns = 0
  let effectRuns = 0
  const doubled = computed(() => {
    computedRuns += 1
    return source.value * 2
  })
  const stop = effect(() => {
    doubled.value
    effectRuns += 1
  })

  batch(() => {
    source.value = 3
    source.value = 4
  })

  if (doubled.value !== 8 || computedRuns !== 2 || effectRuns !== 2) {
    throw new Error(`Runtime reactivity check failed: computedRuns=${computedRuns}, effectRuns=${effectRuns}`)
  }

  stop()
  doubled.dispose()
  source.dispose()

  return {
    computedRuns,
    effectRuns,
    runtime: typeof Bun === 'object' ? 'bun' : typeof Deno === 'object' ? 'deno' : 'node'
  }
}

console.log(JSON.stringify(runRuntimeChecks()))
