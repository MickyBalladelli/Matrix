import { batch, css, delegate, effect, html, mount, runInWorker, signal } from '../src/index.js'
import { createRouter } from '../src/utils/router.js'

const measure = (name, callback) => {
  const start = performance.now()
  const result = callback()
  return {
    name,
    milliseconds: Number((performance.now() - start).toFixed(3)),
    result
  }
}

const measureAsync = async (name, callback) => {
  const start = performance.now()
  const result = await callback()
  return {
    name,
    milliseconds: Number((performance.now() - start).toFixed(3)),
    result
  }
}

const templateHost = document.createElement('div')
document.body.append(templateHost)
const templateView = () => html`<article class="optimization-template"><span>cached</span></article>`
mount(templateView, templateHost).unmount()
const templateMounts = measure('lazy template reuse 100', () => {
  for (let index = 0; index < 100; index += 1) {
    mount(templateView, templateHost).unmount()
  }
})
templateHost.remove()

const eventHost = document.createElement('div')
eventHost.innerHTML = Array.from({ length: 5000 }, (_, index) => `<button class="optimization-target" data-index="${index}">${index}</button>`).join('')
document.body.append(eventHost)
let delegatedClicks = 0
const stopDelegation = delegate(eventHost, 'click', '.optimization-target', () => {
  delegatedClicks += 1
})
const targets = eventHost.querySelectorAll('.optimization-target')
const delegatedDispatch = measure('delegated events across 5000 nodes', () => {
  for (let index = 0; index < targets.length; index += 1) {
    targets[index].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
})
stopDelegation()
eventHost.remove()

const styleDefinitions = measure('static CSS definition reuse 1000', () => {
  const definitions = Array.from({ length: 1000 }, () => css`.optimization-card { color: var(--matrix-color-text); }`)
  return new Set(definitions.map(definition => definition.id)).size
})

const routes = Array.from({ length: 1000 }, (_, index) => ({
  path: `/optimization-${index}`,
  view: () => html`<p>${index}</p>`
}))
const router = createRouter(routes)
const routeMatch = await measureAsync('router match across 1000 routes', async () => {
  await router.navigate('/optimization-999', { scroll: false })
  return router.current.value?.path
})
router.dispose()
window.history.replaceState({}, '', '/')

const batchedSource = signal(0)
let batchedRuns = 0
const stopBatchedEffect = effect(() => {
  batchedSource.value
  batchedRuns += 1
})
const batchedUpdates = measure('signal batch 2000 writes', () => {
  batch(() => {
    for (let index = 0; index < 1000; index += 1) {
      batchedSource.value = index + 1
      batchedSource.value = index + 2
    }
  })
  return batchedRuns
})
stopBatchedEffect()
batchedSource.dispose()

const workerTask = await measureAsync('worker offload sum', () => runInWorker(
  values => values.reduce((total, value) => total + value, 0),
  Array.from({ length: 1000 }, (_, index) => index)
))

window.__MATRIX_BENCHMARK_RESULT__ = {
  measurements: [templateMounts, delegatedDispatch, styleDefinitions, routeMatch, batchedUpdates, workerTask]
    .map(({ name, milliseconds }) => ({ name, milliseconds })),
  results: {
    delegatedClicks,
    styleCacheEntries: styleDefinitions.result,
    routeMatch: routeMatch.result,
    batchedRuns: batchedUpdates.result,
    workerSum: workerTask.result
  },
  userAgent: navigator.userAgent
}

document.body.dataset.matrixOptimizationBenchmarks = 'ready'
