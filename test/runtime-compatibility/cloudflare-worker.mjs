import { batch, computed, effect, signal } from '../../src/index.js'

function checkRuntime() {
  const source = signal(5)
  const doubled = computed(() => source.value * 2)
  let runs = 0
  const stop = effect(() => {
    doubled.value
    runs += 1
  })

  batch(() => {
    source.value = 6
    source.value = 7
  })

  const result = { value: doubled.value, effectRuns: runs }
  stop()
  doubled.dispose()
  source.dispose()

  if (result.value !== 14 || result.effectRuns !== 2) {
    throw new Error(`Cloudflare Worker runtime check failed: ${JSON.stringify(result)}`)
  }

  return result
}

export default {
  async fetch() {
    return new Response(JSON.stringify({
      runtime: 'cloudflare-workers',
      ...checkRuntime()
    }), {
      headers: { 'content-type': 'application/json' }
    })
  }
}
