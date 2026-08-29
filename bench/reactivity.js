import { performance } from 'node:perf_hooks'
import { effect, signal } from '../src/index.js'

const count = signal(0)
let reads = 0
const stop = effect(() => {
  count.value
  reads += 1
})

const iterations = 100000
const memoryBefore = process.memoryUsage().heapUsed
const start = performance.now()

for (let index = 0; index < iterations; index += 1) {
  count.value = index
}

const elapsed = performance.now() - start
const memoryAfter = process.memoryUsage().heapUsed
stop()

const subscribers = [1, 10, 100, 1000].map(size => {
  const source = signal(0)
  const stops = Array.from({ length: size }, () => effect(() => source.value))
  const subscriberStart = performance.now()
  source.value = 1
  const subscriberElapsed = performance.now() - subscriberStart
  for (const unsubscribe of stops) {
    unsubscribe()
  }
  return {
    size,
    milliseconds: Number(subscriberElapsed.toFixed(3))
  }
})

console.log(JSON.stringify({
  iterations,
  reads,
  milliseconds: Number(elapsed.toFixed(2)),
  heapDeltaBytes: memoryAfter - memoryBefore,
  updatesPerSecond: Math.round(iterations / (elapsed / 1000)),
  subscribers
}, null, 2))
