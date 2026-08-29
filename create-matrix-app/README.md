# create-matrix-app

Create a Matrix app with Vite and JSX:

```bash
npx create-matrix-app@next my-app
cd my-app
npm run dev
```

Until the first npm release is published, that command returns E404.

The generated app contains:

```text
index.html
vite.config.js
src/main.jsx
src/style.css
```

JSX is enabled automatically through Matrix's JSX runtime:

```js
import { defineConfig } from 'vite'

const matrixJsx = {
  runtime: 'automatic',
  importSource: '@mickyballadelli/matrix'
}

export default defineConfig({
  oxc: {
    jsx: matrixJsx
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        jsx: matrixJsx
      }
    }
  }
})
```

Write Matrix components with normal JSX:

```jsx
import { mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const App = () => (
  <button onClick={() => count.value++}>{count}</button>
)

mount(App, document.querySelector('#app'))
```

Build the app with:

```bash
npm run build
```
