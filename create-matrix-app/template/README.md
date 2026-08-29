# Matrix app

This app uses Matrix for reactive DOM updates and Vite for bundling.

Start development:

```bash
npm install
npm run dev
```

The app uses JSX in `src/main.jsx`. Matrix's JSX runtime is enabled in `vite.config.js`:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'matrix'
  }
})
```

Build for production:

```bash
npm run build
```
