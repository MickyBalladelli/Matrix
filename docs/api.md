# API Reference

## Reactivity

### `signal(initialValue, options?)`

Returns a signal object with `value`, `get()`, `set(value)`, `update(fn)`, `peek()` and `subscribe(fn)`. `options.equals` replaces the default `Object.is` comparison.

`dispose()` destroys its subscriptions. Any read or write after disposal throws an error.

### `computed(fn, options?)` or `computed({ get, set }, options?)`

Returns a lazy derived value with `value`, `get()`, `peek()` and `subscribe(fn)`. The object form adds a controlled write through `set`. `options.equals` controls change detection.

### `effect(fn, options?)`

Runs `fn` immediately and after every dependency change. Returns `stop()`. A function returned by `fn` runs before the next execution and when stopped. `options.flush` is `sync` or `microtask`.

Name Effects with `options.name` so diagnostics can identify them. By default Matrix warns when an Effect changes its dependency set and includes a stale-closure reminder. Set `warnOnDependencyChange: false` for an intentional dynamic dependency pattern. Avoid `async` Effect callbacks: Matrix does not await them, so return cleanup that cancels asynchronous work or use `resource()`.

### `batch(fn)`

Groups notifications produced during `fn` and returns the callback's result. Use it when one command changes several sources:

```js
batch(() => {
  firstName.value = 'Ada'
  lastName.value = 'Lovelace'
  status.value = 'ready'
})
```

Effects with the default `sync` flush run after the batch callback finishes. Nested batches flush only when the outermost batch finishes. The callback is synchronous: do not hold a batch open across an `await`.

Batching does not mutate objects for you and does not bypass equality checks. Replace an object or array reference when its contents change. Use `flushJobs()` only when a deterministic test or debug harness needs to drain queued microtask work.

### `createScope(parent?)`, `disposeScope(scope)`, `onCleanup(fn)`

Create and clean up groups of Effects, Computeds, resources, and other cleanup callbacks. `scope.run(fn)` activates the scope while `fn` runs:

```js
const scope = createScope()

scope.run(() => {
  effect(() => console.log(count.value), { name: 'logger' })
  onCleanup(() => console.log('view cleanup'))
  scope.add(() => console.log('manual cleanup'))
})

disposeScope(scope)
```

Scopes can be nested. Disposing a parent disposes its child scopes first, then the parent's cleanup callbacks. `onCleanup` only works while a scope is active; use `scope.add` when registering from outside `scope.run`.

### Computed with a custom setter

The object form of `computed` exposes a controlled write path. The getter remains reactive, while the setter decides which source may change:

```js
const celsius = signal(20)
const fahrenheit = computed({
  get: () => celsius.value * 9 / 5 + 32,
  set: value => {
    celsius.value = (value - 32) * 5 / 9
  }
})

console.log(fahrenheit.value)
fahrenheit.set(212)
```

Do not write to a source from its own getter. A Computed without `set` is read-only.

## DOM

### `html(strings, ...values)`

Creates a template result. Expressions can be text, a signal, a Computed, a template, a component, a node or an array.

### JSX runtime

The optional `@mickyballadelli/matrix/jsx-runtime` adapter supports JSX elements, components, fragments, signals and Computeds. Configure Vite's automatic JSX runtime:

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

Vite 8 uses Oxc for transforms and dependency scanning. Set both `oxc.jsx` and `optimizeDeps.rolldownOptions.transform.jsx`, or the scanner falls back to `react/jsx-dev-runtime`.

Then write JSX in `.jsx` files:

```jsx
import { mount, signal } from '@mickyballadelli/matrix'

const count = signal(0)
const App = () => (
  <button onClick={() => count.value++}>{count}</button>
)

mount(App, document.querySelector('#app'))
```

DOM events use `onClick`, `onInput` and similar names. `className` maps to `class`, and common DOM properties such as `value`, `checked` and `disabled` are written as properties. `html` remains available when no JSX build step is wanted.

### `mount(view, container, props?)`

Mounts a view or component. Returns `{ nodes, unmount() }`. Existing container content is preserved.

### `keyed(items, getKey?)`

Creates a reactive keyed list. Keys must be unique. Items that keep their key are moved instead of recreated. When `getKey` is omitted, Matrix uses a JSX runtime key when present, then the item identity.

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

### Lifecycle order

`onMount` runs after the component's view is inserted. If a parent renders a child, the child mounts before the parent mount callback. Cleanup runs in the reverse tree direction: the child is disposed before the parent. This includes Effects, event listeners, resources, `onUnmount` callbacks, and cleanup functions returned by `onMount`.

```js
const Child = () => {
  onMount(() => {
    console.log('child mounted')
    return () => console.log('child mount cleanup')
  })
  onUnmount(() => console.log('child unmounted'))
  return html`<p>Child</p>`
}

const Parent = () => {
  onMount(() => console.log('parent mounted'))
  onUnmount(() => console.log('parent unmounted'))
  return html`<section>${component(Child)}</section>`
}
```

Expected tree-level order is child mount, parent mount; then child cleanup, parent cleanup. Register related cleanup in the scope that owns the resource.

## Styling

- `css` creates a scoped stylesheet.
- `globalCss` creates a global stylesheet.
- `cssVariables` creates static or reactive CSS variables.
- `disposeStyle(definition, document?)` explicitly removes an injected stylesheet.
- `defaultTokens`, `tokens`, `theme` and `utilityCss` provide optional visual primitives.

## Experimental APIs

These surfaces may change before 1.0:

- JSX runtime keys, event modifiers, and automatic runtime configuration.
- Router `search`, `hash`, `base`, redirects, and async guards.
- Plugin extension points.
- `defaultTokens`, `tokens`, `theme`, and `utilityCss`.
- Debug helpers: `createLogger`, `watchDebug`, `inspect`, `inspectEffects`, and `setDevtoolsHook`.

Stable for this alpha: `signal`, `computed`, `effect`, `batch`, `html`, `component`, `mount`, `css`, `cssVariables`, and `keyed`.

## Plugins

### Runtime configuration

`configure({ development: true })` enables extra warnings for prop mutations, untracked signal reads, likely template interpolation typos, router and form misconfigurations, and templates with many dynamic bindings. `getRuntimeConfig()` returns the active settings. The large-template warning defaults to `bindingWarningThreshold: 50`.

```js
import { configure, getRuntimeConfig } from '@mickyballadelli/matrix'

configure({ development: true, bindingWarningThreshold: 25 })
console.log(getRuntimeConfig())
```

`createForm(initialValues, validators, { name })` adds `validateField()`, `inspectField()`, and `inspect()` debugging helpers to the returned form.

`usePlugin({ install(api) { ... } })` listens to four extension points:

- `renderer`: `dom:update` events with the binding kind and affected element or parent.
- `scheduler`: `job:scheduled`, `flush:start`, and `flush:end` events.
- `logger`: `signal:update`, `signal:hot`, debug DOM events, and runtime diagnostics such as dependency changes, invalid component output, and duplicate keys.
- `style`: `style:apply` and `style:dispose` events.

Each `api.on(point, hook)` call returns an unregister function. The plugin's optional cleanup runs before Matrix removes its registrations:

```js
const stopPlugin = usePlugin({
  install(api) {
    const stopRenderer = api.on('renderer', event => {
      console.debug(event.type, event.kind, event.name)
    })
    const stopScheduler = api.on('scheduler', event => {
      console.debug(event.type, event.flush, event.size)
    })

    return () => {
      stopRenderer()
      stopScheduler()
    }
  }
})

stopPlugin()
```

Hooks are synchronous and run on the application update path. Keep them cheap and do not mutate event objects. See [DevTools integration](./devtools.md) for an inspector bridge.

## Utilities

- `createRouter(routes, options)` provides `path`, `search`, `hash`, `current`, `start`, `stop`, `dispose`, async `navigate` and `link`.
- `beforeEach` and `afterEach` may be async. `navigate()` resolves to `false` when a guard blocks navigation.
- A route may define `redirect` as a path or function. Redirects replace history and stop after ten hops.
- `routerView(router, fallback)` turns the current route into a view.
- `createForm(initialValues, validators, options)` provides fields, values, errors, valid, validate, validateField, inspectField, inspect and reset.
- `resource(loader, options)` provides status, data, error, loading, reload and dispose.
- `createLogger`, `watchDebug`, `inspect`, `inspectEffects` and `setDevtoolsHook` support debugging.

### Router guard and redirect example

```js
const router = createRouter([
  { path: '/', view: Home },
  { path: '/login', view: Login },
  { path: '/admin', view: Admin },
  { path: '/old-dashboard', redirect: '/admin' },
  {
    path: '/invite/:token',
    redirect: ({ route }) => `/signup?invite=${encodeURIComponent(route.params.token)}`
  }
], {
  beforeEach: async ({ to }) => {
    if (to?.path === '/admin' && !session.value) return false
    return true
  },
  afterEach: ({ to }) => {
    document.title = to?.path ?? 'Matrix app'
  }
})

router.start()
await router.navigate('/admin')
```

Call `router.stop()` to remove the `popstate` listener while retaining state. Call `router.dispose()` when the router and its reactive sources are no longer needed. Use `replace: true` for navigation that should not add a history entry and `scroll: false` to keep the current scroll position. See [Advanced routing](./routing-advanced.md) for deep links and transitions.

### Debug output

`inspect(source)` returns a snapshot with this shape:

```js
{
  kind: 'signal',
  value: 3,
  subscribers: 1,
  listeners: 0,
  effectSubscribers: ['counter-label']
}
```

`kind` is `signal` or `computed`. `subscribers` counts reactive consumers, `listeners` counts direct `subscribe` listeners, and `effectSubscribers` lists names of subscribed Effects. An unnamed Effect appears as an empty string. The `value` can be a live object reference.

`inspectEffects()` returns active Effects only:

```js
[
  { name: 'counter-label', dependencies: 1 },
  { name: '', dependencies: 2 }
]
```

The `dependencies` count is the number of sources read by the latest Effect run. Stopping an Effect removes it from this list. See [Debugging](./debugging.md) for logging and browser workflows.
