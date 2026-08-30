# Matrix errors and warnings

These are Matrix's own messages. Errors thrown by an application loader, validator, event handler, or route view keep the original application error and are not listed here.

When a named component throws while rendering, Matrix prefixes the error with `[ComponentName]` before rethrowing it. The prefix identifies the render function; the original error remains the cause to investigate.

## Templates, JSX, and DOM

### `html() must be used as a tagged template`

Cause: `html` received a normal value instead of a tagged template call.

Fix:

```js
html`<p>${value}</p>`
```

Do not call `html('<p>...</p>')`.

### `Expressions cannot be used inside a tag name`

Cause: an interpolation was placed in the element name, for example ``html`<${tag}>` ``.

Fix: choose the element in JavaScript and return a view for each supported case. Do not build template source from user input.

### `Empty event name in Matrix template`

Cause: a template contains `@` without an event name.

Fix: use a name such as `@click=${handler}`.

### `Empty property name in Matrix template`

Cause: a template contains `.` without a property name.

Fix: use a property directive such as `.value=${value}`.

### `Empty boolean attribute name in Matrix template`

Cause: a template contains `?` without an attribute name.

Fix: use a boolean directive such as `?disabled=${isDisabled}`.

### `Unsafe dynamic URL rejected for attribute <name>`

Cause: a dynamic `href`, `src`, `action`, `formaction`, `poster`, or `xlink:href` contains a `javascript:`, `vbscript:`, or `data:` scheme.

Fix: use a known-safe relative or same-origin URL. Validate URLs from users or APIs against an allowlist.

### `jsx() expects an element or Matrix component`

Cause: the JSX runtime received an empty string, an unsupported value, or an invalid element type.

Fix: use a lowercase intrinsic element, a function component, or `Fragment`.

### `Matrix does not support dangerouslySetInnerHTML`

Cause: Matrix intentionally rejects React-style raw HTML props.

Fix: interpolate untrusted content as text. If trusted raw HTML is unavoidable, sanitize it before an explicit DOM property assignment and keep that boundary outside normal templates.

### `mount() expects a DOM container`

Cause: `mount` received `null`, a plain object, or a value without `insertBefore`.

Fix: pass an `Element` or `DocumentFragment`, and check a nullable `querySelector` result before mounting.

### `delegate() expects a DOM element`

Cause: the first argument is not an element-like object.

Fix: call `delegate` after the container exists and pass the container itself.

### `delegate() expects a selector and handler function`

Cause: the selector is not a string or the handler is not a function.

Fix: pass a valid CSS selector and callback.

## Reactivity and scopes

### `configure() expects ...`

Cause: runtime configuration received an invalid option value.

Fix: pass an options object, use a boolean for `development`, and use a positive integer for `bindingWarningThreshold`.

### `Effect "<name>" changed dependencies ...`

This warning means an Effect read a different set of signals or Computeds than on its previous run. That is often a stale-closure risk when asynchronous work is not cancelled.

Fix: return cleanup that cancels work started by the Effect. Give the Effect a name with `name` for easier debugging. Set `warnOnDependencyChange: false` for an intentional dynamic dependency pattern.

### `Effect "<name>" returned a Promise ...`

Matrix does not await an Effect callback. Return cleanup that cancels asynchronous work, or use `resource()` for async loading.

### `signal.subscribe() expects a function`

Cause: `subscribe` received a non-function listener.

Fix: pass `(value, previousValue) => { ... }` and retain the returned unsubscribe function.

### `signal.update() expects a function`

Cause: `update` received a value instead of an updater.

Fix: use `signal.set(nextValue)` for a value or `signal.update(value => nextValue)` for a derived write.

### `Cannot read a disposed signal` / `Cannot write to a disposed signal`

Cause: code used a signal after `dispose()` or after its owning scope was disposed.

Fix: stop using the source after cleanup. For long-lived state, create it outside the temporary component scope and dispose it deliberately.

### `computed() expects a function`

Cause: the getter is missing or is not callable.

Fix: pass `computed(() => value)` or the object form `{ get, set }`.

### `computed() expects a valid setter`

Cause: the object form provided a non-function `set` property.

Fix: make `set` a function, or omit it for a read-only Computed.

### `Cannot read a disposed computed value`

Cause: code read a Computed after `dispose()` or scope cleanup.

Fix: remove the stale consumer or keep the Computed alive in the scope that owns it.

### `This computed value is read-only`

Cause: code assigned to `.value` or called `.set()` on a Computed without a setter.

Fix: write to the source signal, or create the Computed with `{ get, set }` when a controlled write is appropriate.

### `Reactive loop detected in effect()` / `Reactive loop detected in computed()`

Cause: a reactive calculation writes to a source that it reads, directly or through another calculation.

Fix: move the write to an event or command path. Keep Computeds pure; use an Effect only for side effects that do not feed the same dependency back into itself.

### `Cannot use a disposed scope`

Cause: `scope.run()` or `scope.add()` was called after `scope.dispose()`.

Fix: create a new scope for new work or stop scheduling work after disposal.

### `A cleanup must be a function`

Cause: `scope.add()` received a non-function.

Fix: register a callback such as `scope.add(() => subscription())`.

### `disposeScope() expects a valid scope`

Cause: the argument is not a scope with `dispose()`.

Fix: pass the object returned by `createScope()`.

### `onCleanup() must be called inside an active scope`

Cause: `onCleanup` ran outside a component, Effect, or `scope.run()` callback.

Fix: call it during scoped setup, or use `scope.add()` when managing an explicit scope.

### `Component state order changed at slot <n>` / `Component state order changed: expected <n> slots, received <n>`

Cause: `signal`, `computed`, `resource`, or `createRouter` was called conditionally or in a different order between component renders.

Fix: create component state unconditionally in stable order. Put conditions inside the Computed or Effect instead of around state creation.

## Components and lists

### `component() expects a render function. Received ...`

Cause: the first argument to `component` is not callable.

Fix: pass a function that receives props and returns a Matrix view. The error includes the received value and a corrected usage example.

When a named component fails, Matrix prefixes the error with `[ComponentName]` and appends the component creation location to the stack when available. This keeps the user component visible alongside the original error.

### `Component "<name>" returned ...`

This warning means a component returned a plain object, number, string, or another value that is rendered as text instead of a Matrix template, component, Signal, Computed, array, or DOM node.

Fix: return `html\`...\``, a component result, reactive value, array, DOM node, or `null`.

### `Component props are read-only`

Cause: a component assigned to or deleted a prop.

Fix: props flow down. Create local state for local edits or ask the parent to update its signal.

### `onMount() expects a function` / `onUnmount() expects a function`

Cause: a lifecycle helper received a non-function.

Fix: pass a callback.

### `onMount() must be called inside a component` / `onUnmount() must be called inside a component`

Cause: the lifecycle helper ran outside a component render.

Fix: call it from a function passed to `component` or from a view passed directly to `mount`.

### `provide() must be called inside a component`

Cause: `provide` has no component context to attach to.

Fix: call it while a component is rendering. Use a module signal for intentionally global state.

### `errorBoundary() expects a render function`

Cause: the boundary render argument is not callable.

Fix: pass a component-like render function, a fallback view or fallback function, and optional props.

### `keyed() expects a key function`

Cause: the second argument to `keyed` is not callable.

Fix: pass `item => item.id`, or omit the argument to use an item's `key` or identity.

### `Duplicate list key "<key>" detected before reconciliation`

Cause: two items in the same keyed list returned the same key. Matrix emits this warning before throwing `Duplicate list key: <key>`.

Fix: use a stable unique ID. Do not use an array index when insertion or removal can reorder items.

## Forms, resources, styles, and routing

### Development diagnostics

With `configure({ development: true })`, Matrix reports common router and form mistakes through `console.warn` and the `logger` plugin point. Form validators should target an existing field, be functions, and return a string or `undefined`.

### `use:bind expects a writable signal`

Cause: `use:bind` received a Computed, raw value, or non-writable object.

Fix: bind a signal created with `signal()`. Use `.value` or `.set()` for other state flows.

### `resource() expects a function`

Cause: the resource loader is not callable.

Fix: pass an async or Promise-returning loader.

### `Cannot reload a disposed resource`

Cause: `reload()` ran after resource cleanup.

Fix: cancel the caller's work when its owner is disposed, or create a new resource.

### `cssVariables() expects an object`

Cause: CSS variable definitions were not passed as an object.

Fix: use `cssVariables({ '--accent': accent })`.

### `use:style expects a css() result`

Cause: `use:style` received a plain string or another style-like object.

Fix: create the definition with `css()` and pass that result.

### `use:vars expects a cssVariables() result`

Cause: `use:vars` received a plain object or another value.

Fix: wrap variables with `cssVariables()` or `tokens()`.

### `disposeStyle() expects a css() or globalCss() result`

Cause: `disposeStyle` received a value that Matrix did not create.

Fix: retain the `StyleDefinition` returned by `css()` or `globalCss()`.

### `createRouter() must be used in a browser`

Cause: router creation tried to read `window` in Node or another server environment.

Fix: create the router during browser startup. Importing Matrix on a server is safe; calling browser-only APIs is not.

### `Cannot start a disposed router` / `Cannot navigate a disposed router`

Cause: a router was used after `dispose()`.

Fix: stop pending work and create a new router for a new application lifetime.

### `Router redirect limit exceeded`

Cause: redirects formed a loop or exceeded ten hops.

Fix: inspect every redirect destination and guarantee that a route eventually resolves to a view or no redirect.

### `createRouter().navigate() only accepts same-origin URLs`

Cause: `navigate()` received an external origin.

Fix: use a normal external `<a href>` for external navigation. Use `router.navigate()` only for same-origin application routes.

## Plugins and debugging

### `Unknown plugin extension point: <name>`

Cause: a plugin used a point other than `renderer`, `scheduler`, `logger`, or `style`.

Fix: choose one of the four public points. Common misspellings include a `Did you mean "..."?` suggestion.

### `usePlugin() expects a plugin with install(api)`

Cause: the value passed to `usePlugin` does not implement `install`.

Fix: pass `{ install(api) { ... } }`.

### `A plugin hook must be a function`

Cause: `api.on(point, hook)` received a non-function hook.

Fix: pass a callback and retain the returned unregister function when needed.

### `watchDebug() expects a signal or computed value`

Cause: the debug helper received a value without `.get()`.

Fix: pass a Signal or Computed.

### `Multiple @mickyballadelli/matrix runtimes are loaded...`

This is a warning, not a thrown error. It means the application bundled more than one Matrix runtime copy. The warning includes the first and current runtime URLs and load timestamps. Deduplicate the dependency and avoid mixing a linked source copy with the published package.

## Local release checks

These messages come from repository tooling:

- `Package name must be @mickyballadelli/matrix`: the root package name changed; restore the published package name.
- `Package must not be private`: remove `private: true` before publishing.
- `dist/app must not be included in the Matrix package`: remove generated application output from the package tree.
- `Empty module: <entry>`: a public export built to an empty module; inspect the entry and rebuild.
- `Matrix size budget exceeded: <entries>`: a public bundle exceeded its Brotli budget; inspect the size report before changing a budget.
- `Unknown browser. Use one of: chromium, firefox, webkit`: `--browser` or `MATRIX_BROWSER` contains another name; choose one of the three local Playwright engines.
- `Reactivity performance budget exceeded: ...`: the Node benchmark fell below its update-rate budget or exceeded its subscriber-update budget; inspect the changed reactive path.
- `DOM performance budget exceeded: ...`: a browser benchmark exceeded its configured timing budget; rerun one engine and inspect the DOM operation path.
