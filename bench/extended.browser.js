import { cssVariables, effect, html, keyed, mount, signal } from '../src/index.js'

const measure = (name, callback) => {
  const start = performance.now()
  const result = callback()
  return {
    name,
    milliseconds: Number((performance.now() - start).toFixed(3)),
    result
  }
}

const memorySnapshot = () => {
  const memory = performance.memory
  if (!memory) {
    return null
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit
  }
}

const idleMemory = memorySnapshot()
const memorySignalsBefore = memorySnapshot()
const memorySignals = Array.from({ length: 1000 }, () => signal(0))
const memorySignalsAllocated = memorySnapshot()
memorySignals.forEach(source => source.dispose())
const memorySignalsAfterDispose = memorySnapshot()

const memoryEffectSource = signal(0)
const memoryEffectsBefore = memorySnapshot()
const memoryEffectStops = Array.from({ length: 1000 }, () => effect(() => memoryEffectSource.value))
const memoryEffectsAllocated = memorySnapshot()
memoryEffectStops.forEach(stop => stop())
memoryEffectSource.dispose()
const memoryEffectsAfterDispose = memorySnapshot()

const listHost = document.createElement('div')
document.body.append(listHost)
const listItems = signal(Array.from({ length: 10000 }, (_, index) => ({ id: index, label: `item-${index}` })))
const listMount = measure('keyed list mount 10000', () => mount(() => html`
  <ul>${keyed(listItems, item => item.id)}</ul>
`, listHost))
const listUpdate = measure('keyed list update 10000', () => {
  listItems.value = [...listItems.value].reverse()
})
const listUnmount = measure('keyed list unmount 10000', () => listMount.result.unmount())
listItems.dispose()
listHost.remove()

const variableHost = document.createElement('div')
document.body.append(variableHost)
const variableSources = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [`--matrix-benchmark-${index}`, signal(String(index))])
)
const variableDefinition = cssVariables(variableSources)
const variableApp = mount(() => html`<div use:vars=${variableDefinition}>variables</div>`, variableHost)
const variableUpdate = measure('css variables update 100', () => {
  for (const [index, source] of Object.values(variableSources).entries()) {
    source.value = String(index + 1)
  }
})
variableApp.unmount()
Object.values(variableSources).forEach(source => source.dispose())
variableHost.remove()

const rapidSource = signal(0)
let rapidReads = 0
const rapidStops = Array.from({ length: 100 }, () => effect(() => {
  rapidSource.value
  rapidReads += 1
}))
const rapidUpdates = measure('rapid signal updates 100 subscribers', () => {
  for (let index = 0; index < 1000; index += 1) {
    rapidSource.value = index + 1
  }
})
rapidStops.forEach(stop => stop())
rapidSource.dispose()

const measurements = [listMount, listUpdate, listUnmount, variableUpdate, rapidUpdates]
  .map(({ name, milliseconds }) => ({ name, milliseconds }))

window.__MATRIX_BENCHMARK_RESULT__ = {
  measurements,
  memory: {
    idle: idleMemory,
    signals1000: {
      before: memorySignalsBefore,
      allocated: memorySignalsAllocated,
      afterDispose: memorySignalsAfterDispose
    },
    effects1000: {
      before: memoryEffectsBefore,
      allocated: memoryEffectsAllocated,
      afterDispose: memoryEffectsAfterDispose
    }
  },
  rapidReads,
  userAgent: navigator.userAgent
}

document.body.dataset.matrixExtendedBenchmarks = 'ready'
