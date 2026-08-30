import { computed, html, mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const doubled = computed(() => count.value * 2)

mount(() => html`
  <main>
    <h1>Matrix + Rollup</h1>
    <button @click=${() => count.update(value => value + 1)}>${count}</button>
    <output>${doubled}</output>
  </main>
`, document.querySelector('#app'))
