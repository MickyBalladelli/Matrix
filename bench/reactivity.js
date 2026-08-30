import { performance } from 'node:perf_hooks'
import { batch, computed, effect, signal } from '../src/index.js'
import { performanceBudgets } from './performance-budgets.js'

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

const rapidSource = signal(0)
let rapidReads = 0
const rapidStops = Array.from({ length: 100 }, () => effect(() => {
  rapidSource.value
  rapidReads += 1
}))
const rapidStart = performance.now()
for (let index = 0; index < 1000; index += 1) {
  rapidSource.value = index
}
const rapidElapsed = performance.now() - rapidStart
for (const unsubscribe of rapidStops) {
  unsubscribe()
}
rapidSource.dispose()

const batchFirst = signal(0)
const batchSecond = signal(0)
let batchedEffectRuns = 0
let batchedComputedRuns = 0
const batchTotal = computed(() => {
  batchedComputedRuns += 1
  return batchFirst.value + batchSecond.value
})
const stopBatchedEffect = effect(() => {
  batchTotal.value
  batchedEffectRuns += 1
})
const batchStart = performance.now()
batch(() => {
  for (let index = 0; index < 1000; index += 1) {
    batchFirst.value = index + 1
    batchSecond.value = index + 1
  }
})
const batchElapsed = performance.now() - batchStart
stopBatchedEffect()
batchTotal.dispose()
batchFirst.dispose()
batchSecond.dispose()

const result = {
  iterations,
  reads,
  milliseconds: Number(elapsed.toFixed(2)),
  heapDeltaBytes: memoryAfter - memoryBefore,
  updatesPerSecond: Math.round(iterations / (elapsed / 1000)),
  subscribers,
  rapidSignalUpdates: {
    updates: 1000,
    subscribers: 100,
    reads: rapidReads,
    milliseconds: Number(rapidElapsed.toFixed(3))
  },
  batching: {
    updates: 1000,
    writes: 2000,
    effectRuns: batchedEffectRuns,
    computedRuns: batchedComputedRuns,
    milliseconds: Number(batchElapsed.toFixed(3)),
    coalesced: batchedEffectRuns === 2 && batchedComputedRuns === 2
  }
}

console.log(JSON.stringify(result, null, 2))

if (process.argv.includes('--check')) {
  const failures = []

  if (result.updatesPerSecond < performanceBudgets.reactivity.minUpdatesPerSecond) {
    failures.push(`updatesPerSecond ${result.updatesPerSecond} < ${performanceBudgets.reactivity.minUpdatesPerSecond}`)
  }

  const slowSubscriber = result.subscribers.find(({ milliseconds }) => (
    milliseconds > performanceBudgets.reactivity.maxSubscriberUpdateMilliseconds
  ))
  if (slowSubscriber) {
    failures.push(`subscriber update for ${slowSubscriber.size} effects took ${slowSubscriber.milliseconds}ms`)
  }

  if (!result.batching.coalesced) {
    failures.push('batch did not coalesce reactive updates')
  }

  if (failures.length > 0) {
    throw new Error(`Reactivity performance budget exceeded: ${failures.join('; ')}`)
  }
}
