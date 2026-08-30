# Matrix

Matrix is a tiny reactive JavaScript framework. It uses signals, effects and computed states. It updates the DOM directly, with no Virtual DOM and no mandatory compiler.

## Getting started

Install the alpha from npm. Matrix is ESM-only and has no runtime dependencies.

```bash
npm install @mickyballadelli/matrix@next
```

```js
import { computed, effect, html, mount, signal } from '@mickyballadelli/matrix'
```

`npm run build` creates the browser ESM output in `dist/matrix.js`.

Before release, run `npm run verify:release`. It checks Node behavior, types, Chromium/Firefox/WebKit, package exports, performance budgets and bundle size.

## Create a Matrix app

Create a standalone Matrix + Vite app:

```bash
npx create-matrix-app@next my-app
cd my-app
npm run dev
```

For local development in this repository, use:

```bash
npm run create-app -- examples/my-app
```

The generator creates `package.json`, `README.md`, `vite.config.js`, `index.html`, `src/main.jsx` and `src/style.css`. The generated app has its own Vite setup, automatic JSX support and imports Matrix as a package.

The generated `vite.config.js` enables Matrix JSX:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@mickyballadelli/matrix'
  }
})
```

## Example

A complete Counter application lives in `examples/counter`. The TODO application lives in `examples/todo`.

The repository also includes complete feature examples:

- `examples/shopping-cart`: catalog, cart state, routing, checkout validation, and an async order adapter.
- `examples/notes`: searchable notes, a complex editor form, and local storage persistence.
- `examples/dashboard`: keyed metric components, filters, async data, and performance timeline capture.
- `examples/chat`: WebSocket lifecycle and message handling with an offline echo transport.
- `examples/blog`: safe Markdown rendering and article search.
- `examples/admin-dashboard`: filterable, sortable, paginated data tables.
- `examples/e-commerce`: catalog filters, sorting, and cart state.
- `examples/spa`: router, forms, resources, keyed lists, lifecycle, and themes.
- `examples/server-integration`: a real `fetch` API adapter with an injectable local test adapter.
- `examples/extensions`: custom form inputs, state persistence, analytics, error reporting, accessibility audits, and performance monitoring plugins.

Each example has a README with local run and test notes. Run the official example fixture with `npm run test:browser:official-examples`.

## Independent Matrix + Vite app

The `examples/vite-app` directory is a standalone Matrix app. It has its own `package.json`, Vite commands and dependencies. It does not use the root project scripts. It also shows optional JSX support.

Start the app from its directory:

```bash
cd examples/vite-app
npm install
npm run dev
```

Open `http://localhost:5173/` in the browser.

The app imports Matrix as a package and uses JSX:

```jsx
import { mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const App = () => (
  <button onClick={() => count.value++}>{count}</button>
)

mount(App, document.querySelector('#app'))
```

Use `onClick`, `onInput` and similar event names in JSX. `className` maps to `class`, and Matrix signals can be rendered directly with `{count}`.

The example enables JSX in `vite.config.js` with Matrix’s automatic JSX runtime. Vite finds the local `index.html`, bundles the app and its Matrix dependency, and writes the production app to `dist/` inside the example:

```bash
npm run build
npm run preview
```

```js
import { computed, effect, html, mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const doubled = computed(() => count.value * 2)

const App = () => html`
  <main>
    <p>${count} × 2 = ${doubled}</p>
    <button @click=${() => count.update(value => value + 1)}>
      Add
    </button>
  </main>
`

mount(App, document.querySelector('#app'))
```

## Documentation

- [10-minute tutorial](docs/tutorial-10-minute.md)
- [Common patterns](docs/common-patterns.md)
- [Form validation](docs/forms.md)
- [Advanced routing](docs/routing-advanced.md)
- [CSS scoping](docs/css-scoping.md)
- [Performance tips](docs/performance-tips.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Security](docs/security.md)
- [API reference](docs/api.md)

Developer guides:

- [Error messages](docs/errors.md)
- [Development mode](docs/development-mode.md)
- [IDE setup](docs/ide-setup.md)
- [Build tool integration](docs/build-tools.md)
- [Debugging](docs/debugging.md)
- [DevTools integration](docs/devtools.md)
- [Testing strategies](docs/testing-strategies.md)
- [Accessibility checklist](docs/accessibility.md)
- [Plugins and extension patterns](docs/plugins.md)

## API

- `signal(value)` creates reactive state with `.value`, `.set()`, `.update()` and `.subscribe()`.
- `configure({ development: true })` enables extra runtime checks and diagnostics.
- `effect(fn)` runs a function and automatically tracks its signals.
- `computed(fn)` calculates a lazy derived value.
- `batch(fn)` groups several writes into one update.
- `html` creates a DOM template with dynamic text, attributes, properties and events.
- `component(fn, props)` creates an explicit functional component.
- `mount(view, element)` mounts a view and returns `unmount()`.
- `css`, `cssVariables` and `globalCss` provide lightweight styling.
- `createRouter` and `routerView` provide minimal History API navigation.
- `createForm` and `resource` cover common needs without entering the core.
- `usePlugin` observes the renderer, scheduler, logs and styles.
- `createDevtools` exposes local component, reactive graph, router and performance inspection.

## DOM directives

```js
import { css, cssVariables, html, signal } from '@mickyballadelli/matrix'

const color = signal('tomato')
const card = css`.card { color: var(--card-color) }`
const vars = cssVariables({ '--card-color': color })

const view = html`
  <article use:style=${card} use:vars=${vars} class="card">
    <input use:bind=${color}>
  </article>
`
```

- `@click=${handler}` listens for an event.
- `.value=${source}` binds a DOM property.
- `?disabled=${source}` handles a boolean attribute.
- `use:style=${cssDefinition}` applies scoped styling.
- `use:vars=${cssVariables({...})}` binds CSS variables to signals.
- `use:bind=${signal}` synchronizes a form field.

To delay form writes, use `use:bind=${{ source: email, debounce: 150 }}`.

## Status

The project is alpha. The reactive core and DOM renderer are operational. The router, forms, styles and DX tools are intentionally small.

Matrix supports modern ESM browsers. The automated browser target is current Chromium, Firefox, and WebKit. SSR and hydration are not part of this alpha; importing the package on a server is safe, but DOM and router APIs must only be called in a browser.
