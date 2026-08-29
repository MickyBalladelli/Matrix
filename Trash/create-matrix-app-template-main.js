import { computed, html, mount, signal } from 'matrix'
import './style.css'

const count = signal(0)
const doubled = computed(() => count.value * 2)

const App = () => html`
  <main class="app">
    <p class="eyebrow">Matrix + Vite</p>
    <h1>My Matrix app</h1>
    <p>Matrix handles reactive DOM updates. Vite handles the app build.</p>
    <p class="count" aria-live="polite">${count}</p>
    <div class="actions">
      <button @click=${() => count.update(value => value - 1)}>-1</button>
      <button @click=${() => count.update(value => value + 1)}>+1</button>
      <button @click=${() => count.value = 0}>Reset</button>
    </div>
    <p>Double: ${doubled}</p>
  </main>
`

mount(App, document.querySelector('#app'))
