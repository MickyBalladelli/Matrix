import { computed, css, html, mount, signal } from 'matrix'

const count = signal(0)
const doubled = computed(() => count.value * 2)

const appStyle = css`
  .app {
    max-width: 34rem;
    margin: 4rem auto;
    padding: 2rem;
    border: 1px solid #dbe4f0;
    border-radius: 1rem;
    font-family: system-ui, sans-serif;
    color: #172033;
    background: #f8fbff;
    box-shadow: 0 1rem 3rem rgb(23 32 51 / 10%);
  }

  .eyebrow {
    margin: 0;
    color: #2563eb;
    font-size: .8rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .count {
    margin: 1.5rem 0;
    font-size: 4rem;
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: .5rem;
  }

  button {
    border: 0;
    border-radius: .5rem;
    padding: .65rem 1rem;
    color: white;
    background: #2563eb;
    cursor: pointer;
  }
`

const App = () => html`
  <main use:style=${appStyle} class="app">
    <p class="eyebrow">Matrix + Vite</p>
    <h1>Small app, fast build</h1>
    <p>Matrix updates the DOM. Vite bundles the app.</p>
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
