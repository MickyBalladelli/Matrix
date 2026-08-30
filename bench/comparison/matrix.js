import { html, mount } from '../../src/dom/index.js'
import { signal } from '../../src/reactivity/index.js'

export function createAdapter(container) {
  const count = signal(0)
  const app = mount(() => html`<button>${count}</button>`, container)

  return {
    update(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        count.value = index + 1
      }
    },
    dispose() {
      app.unmount()
      count.dispose()
    }
  }
}
