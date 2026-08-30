# Troubleshooting

Start with the smallest failing example. Confirm that the view is mounted, the signal is the value being updated, and the browser console has no earlier error.

## Nothing updates

- Make sure the template receives the signal or a `Computed`, not a snapshot such as `count.value` created once outside a reactive binding.
- Read source signals with `.value` inside a `Computed` or `effect` so Matrix can track them.
- If the update is queued with `flush: 'microtask'`, wait for the microtask or call `flushJobs()` in a test.
- When updating objects or arrays, replace the reference or return a new reference from `update`. The default equality check is `Object.is`.

```js
const label = computed(() => `${firstName.value} ${lastName.value}`)
const view = html`<h1>${label}</h1>`
```

## `html() must be used as a tagged template`

Use the tag form:

```js
html`<p>${message}</p>`
```

Do not pass a normal string to `html()`.

## `Props modified inside a component`

Component props are read-only. Do not assign to `props.name` or delete a prop. Use a local signal for local edits, or send an event/callback to the owner of the state.

## `use:bind expects a writable signal`

`use:bind` needs a signal created with `signal()`. It cannot write to a `Computed`, a plain value, or a read-only source.

```js
const name = signal('')
html`<input use:bind=${name}>`
```

## `Duplicate list key`

The key function returned the same value twice in one list. Use a stable unique ID and check that filtering or mapping does not collapse distinct items to the same key.

## Styles are missing

- Apply the result of `css()` with `use:style` on an element.
- Make sure the component has a root element that receives the scope.
- Use `globalCss()` only when the rule is intentionally global.
- If styles were disposed, keep the `StyleDefinition` and apply it again or recreate it.

## Router errors

`createRouter()` requires a browser because it reads `window.location` and uses the History API. Call `router.start()` once the application is mounted, and call `router.stop()` or `router.dispose()` when the router is no longer needed.

Navigation accepts same-origin URLs only. A guard returns `false` to cancel navigation. A redirect loop throws after ten hops.

## Async data looks stale

`resource` cancels the previous request when `reload()` starts another one. Pass the supplied `AbortSignal` to `fetch` and ignore work after an abort. Check `status`, `loading`, `data`, and `error` in one `Computed` so the displayed state stays consistent.

## Debug the dependency graph

Use the debug helpers during development:

```js
const stop = watchDebug(count, 'counter')
console.log(inspect(count))
console.log(inspectEffects())

// Later, when the view is gone:
stop()
```

`createLogger({ enabled: true })` provides the same inspection helpers with a configured console and warning threshold. `usePlugin` can observe renderer, scheduler, logger, and style events.

## Check the environment

- Serve browser modules over HTTP when relative ESM imports are involved; do not rely on `file://`.
- Confirm the package import points to one Matrix runtime. Multiple copies can split signals and plugin events.
- DOM APIs, styles, forms, and the router need a browser. Importing the package in Node is safe, but calling browser-only APIs in Node is not.
