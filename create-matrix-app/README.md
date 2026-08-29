# create-matrix-app

Create a Matrix app with Vite and JSX:

```bash
npx create-matrix-app my-app
cd my-app
npm run dev
```

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

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'matrix'
  }
})
```

Write Matrix components with normal JSX:

```jsx
import { mount, signal } from 'matrix'

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
