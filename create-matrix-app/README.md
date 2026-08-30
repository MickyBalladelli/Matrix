# create-matrix-app

Create a Matrix app with Vite and JSX:

```bash
npx create-matrix-app my-app
cd my-app
npm run dev
```

Start from the official Blog example instead:

```bash
npx create-matrix-app my-blog --example blog
```

The generated app includes Matrix and Vite configuration ready for local development.

The generated app contains:

```text
index.html
vite.config.js
src/main.jsx
src/style.css
```

The `--example blog` option replaces `src/main.jsx` with a small reactive blog starter while keeping the same Vite setup.

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
