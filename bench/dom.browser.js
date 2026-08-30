import { html, keyed, mount, signal } from '../src/index.js'

const host = document.createElement('div')
document.body.append(host)
let domOperations = 0
const insertBefore = host.insertBefore.bind(host)
const removeChild = host.removeChild.bind(host)
host.insertBefore = (node, before) => {
  domOperations += 1
  return insertBefore(node, before)
}
host.removeChild = node => {
  domOperations += 1
  return removeChild(node)
}

const measure = (name, callback) => {
  const start = performance.now()
  const result = callback()
  return { name, milliseconds: Number((performance.now() - start).toFixed(3)), result }
}

const count = signal(0)
const initial = measure('mount initial', () => mount(() => html`
  <section><output>${count}</output></section>
`, host))

const update = measure('single signal update', () => {
  domOperations = 0
  count.value = 1
})
update.domOperations = domOperations

const items = signal(Array.from({ length: 1000 }, (_, index) => ({ id: index, label: `item-${index}` })))
const list = measure('keyed list mount 1000', () => mount(() => html`
  <ul>${keyed(items, item => item.id)}</ul>
`, host))

const keyedUpdate = measure('keyed list reorder 1000', () => {
  domOperations = 0
  items.value = [...items.value].reverse()
})
keyedUpdate.domOperations = domOperations

const replacement = measure('full replacement reference', () => {
  const value = signal('old')
  const app = mount(() => html`<p>${value}</p>`, host)
  value.value = 'new'
  app.unmount()
})

const measurements = [initial, update, list, keyedUpdate, replacement].map(({ name, milliseconds }) => ({
  name,
  milliseconds
}))

console.table(measurements)
initial.result.unmount()
list.result.unmount()

window.__MATRIX_BENCHMARK_RESULT__ = {
  measurements,
  domOperations: {
    singleSignalUpdate: update.domOperations,
    keyedReorder: keyedUpdate.domOperations
  },
  userAgent: navigator.userAgent
}

document.body.dataset.matrixBenchmarks = 'ready'
