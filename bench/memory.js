import { effect, signal } from '../src/index.js'

const collect = () => {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc()
  }
  return process.memoryUsage().heapUsed
}

const measureAllocation = (create, dispose) => {
  const before = collect()
  let value = create()
  const allocated = collect()
  dispose(value)
  value = null
  const afterDispose = collect()

  return {
    allocatedBytes: allocated - before,
    retainedBytes: afterDispose - before
  }
}

const idleHeapUsedBytes = collect()
const signals = measureAllocation(
  () => Array.from({ length: 1000 }, () => signal(0)),
  values => values.forEach(value => value.dispose())
)
const effects = measureAllocation(
  () => {
    const source = signal(0)
    const stops = Array.from({ length: 1000 }, () => effect(() => source.value))
    return { source, stops }
  },
  ({ source, stops }) => {
    stops.forEach(stop => stop())
    source.dispose()
  }
)

console.log(JSON.stringify({
  idleHeapUsedBytes,
  signals1000: signals,
  effects1000: effects,
  gcAvailable: typeof globalThis.gc === 'function',
  node: process.version
}, null, 2))
