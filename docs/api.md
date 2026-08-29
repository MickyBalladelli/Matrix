# API Reference

## Reactivity

### `signal(initialValue, options?)`

Returns a signal object with `value`, `get()`, `set(value)`, `update(fn)`, `peek()` and `subscribe(fn)`. `options.equals` replaces the default `Object.is` comparison.

`dispose()` destroys its subscriptions. Any read or write after disposal throws an error.

### `computed(fn, options?)` or `computed({ get, set }, options?)`

Returns a lazy derived value with `value`, `get()`, `peek()` and `subscribe(fn)`. The object form adds a controlled write through `set`. `options.equals` controls change detection.

### `effect(fn, options?)`

Runs `fn` immediately and after every dependency change. Returns `stop()`. A function returned by `fn` runs before the next execution and when stopped. `options.flush` is `sync` or `microtask`.

### `batch(fn)`

Groups notifications produced during `fn`.

### `createScope(parent?)`, `disposeScope(scope)`, `onCleanup(fn)`

Create and clean up groups of effects. `scope.run(fn)` activates the scope while `fn` runs.

## DOM

### `html(strings, ...values)`

Creates a template result. Expressions can be text, a signal, a Computed, a template, a component, a node or an array.

### JSX runtime

The optional `matrix/jsx-runtime` adapter supports JSX elements, components, fragments, signals and Computeds. Configure Vite's automatic JSX runtime:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'matrix'
  }
})
```

Then write JSX in `.jsx` files:

```jsx
import { mount, signal } from 'matrix'

const count = signal(0)
const App = () => (
  <button onClick={() => count.value++}>{count}</button>
)

mount(App, document.querySelector('#app'))
```

DOM events use `onClick`, `onInput` and similar names. `className` maps to `class`, and common DOM properties such as `value`, `checked` and `disabled` are written as properties. `html` remains available when no JSX build step is wanted.

### `mount(view, container, props?)`

Mounts a view or component. Returns `{ nodes, unmount() }`. Existing container content is preserved.

### `keyed(items, getKey)`

Creates a reactive keyed list. Keys must be unique. Items that keep their key are moved instead of recreated.

### Directives

- `@event.modifier=${handler}`: `once`, `capture`, `passive`, `prevent`, `stop`.
- `.property=${value}`: writes a DOM property.
- `?attribute=${value}`: toggles a boolean attribute.
- `use:style=${css(...)}`: applies scoped CSS.
- `use:vars=${cssVariables({...})}`: applies CSS variables.
- `use:bind=${signal}`: creates a two-way form binding.

`delegate(element, event, selector, handler)` delegates an event to a container.

Dynamic `javascript:`, `vbscript:` and `data:` URLs are rejected in URL attributes and properties.

## Components

- `component(render, props)` creates an explicit component.
- `onMount(fn)` runs after insertion.
- `onUnmount(fn)` registers component cleanup.
- `provide(key, value)` makes a value available to descendants.
- `inject(key, fallback?)` reads a value provided by an ancestor.
- `errorBoundary(render, fallback, props?)` renders a fallback view if a descendant throws.

## Styling

- `css` creates a scoped stylesheet.
- `globalCss` creates a global stylesheet.
- `cssVariables` creates static or reactive CSS variables.
- `disposeStyle(definition, document?)` explicitly removes an injected stylesheet.
- `defaultTokens`, `tokens`, `theme` and `utilityCss` provide optional visual primitives.

## Lightweight plugins

`usePlugin({ install(api) { ... } })` listens to the `renderer`, `scheduler`, `logger` and `style` extension points.

```js
const stopPlugin = usePlugin({
  install(api) {
    return api.on('renderer', event => console.debug(event))
  }
})

stopPlugin()
```

## Utilities

- `createRouter(routes, options)` provides `path`, `current`, `start`, `stop`, `navigate` and `link`.
- `routerView(router, fallback)` turns the current route into a view.
- `createForm(initialValues, validators)` provides fields, values, errors, valid, validate and reset.
- `resource(loader, options)` provides status, data, error, loading and reload.
- `createLogger`, `watchDebug`, `inspect`, `inspectEffects` and `setDevtoolsHook` support debugging.
