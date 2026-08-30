import { computed, mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const doubled = computed(() => count.value * 2)

const App = () => (
  <main>
    <h1>Matrix + Webpack 5</h1>
    <button onClick={() => count.update(value => value + 1)}>{count}</button>
    <output>{doubled}</output>
  </main>
)

mount(App, document.querySelector('#app'))
