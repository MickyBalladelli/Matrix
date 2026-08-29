import {
  component,
  computed,
  css,
  cssVariables,
  html,
  mount,
  signal
} from '../../src/index.js'

const count = signal(0)
const name = signal('Grog')
const accent = signal('#2563eb')
const doubled = computed(() => count.value * 2)
const message = computed(() => `${name.value} compte ${count.value} fois`)

const appStyle = css`
  .app {
    max-width: 32rem;
    margin: 4rem auto;
    padding: 2rem;
    border-radius: 1rem;
    font-family: system-ui, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    box-shadow: 0 1rem 3rem rgb(15 23 42 / 12%);
  }

  .actions {
    display: flex;
    gap: .5rem;
    align-items: center;
  }

  button {
    border: 0;
    border-radius: .5rem;
    padding: .6rem .9rem;
    color: white;
    background: var(--accent);
    cursor: pointer;
  }

  input {
    border: 1px solid #cbd5e1;
    border-radius: .5rem;
    padding: .6rem;
  }

  .count {
    font-size: 3rem;
    margin: 1rem 0;
  }
`

const CounterControls = () => html`
  <div class="actions">
    <button @click=${() => count.update(value => value - 1)}>-1</button>
    <button @click=${() => count.update(value => value + 1)}>+1</button>
    <button @click=${() => count.value = 0}>Reset</button>
  </div>
`

const App = () => html`
  <main use:style=${appStyle} use:vars=${cssVariables({ '--accent': accent })} class="app">
    <h1>Matrix Counter</h1>
    <p>Petit exemple : signals, computed, composant et DOM direct.</p>
    <label>
      Ton nom
      <input use:bind=${name}>
    </label>
    <p class="count" aria-live="polite">${count}</p>
    <p>${message}</p>
    <p>Double : ${doubled}</p>
    ${component(CounterControls)}
    <p>
      <label>
        Couleur
        <input type="color" .value=${accent} @input=${event => accent.value = event.currentTarget.value}>
      </label>
    </p>
  </main>
`

mount(App, document.querySelector('#app'))
