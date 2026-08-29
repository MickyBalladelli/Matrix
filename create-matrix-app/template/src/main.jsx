import { computed, mount, signal } from '@mickyballadelli/matrix'
import './style.css'

const count = signal(0)
const doubled = computed(() => count.value * 2)

const CounterButton = ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
)

const App = () => (
  <main className="app">
    <p className="eyebrow">Matrix + Vite + JSX</p>
    <h1>My Matrix app</h1>
    <p>JSX describes the view. Matrix updates the DOM.</p>
    <p className="count" aria-live="polite">{count}</p>
    <div className="actions">
      <CounterButton onClick={() => count.update(value => value - 1)}>-1</CounterButton>
      <CounterButton onClick={() => count.update(value => value + 1)}>+1</CounterButton>
      <CounterButton onClick={() => count.value = 0}>Reset</CounterButton>
    </div>
    <p>Double: {doubled}</p>
  </main>
)

mount(App, document.querySelector('#app'))
