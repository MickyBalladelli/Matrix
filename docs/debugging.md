# Debugging Matrix apps

Matrix debugging has three layers: the browser's normal tools, the reactive inspection helpers, and optional plugin/devtools events.

## Browser DevTools

Use the browser first:

1. Open the Console and fix the first error, not the last cascade of errors.
2. Use the Sources panel to set a breakpoint in the component or event handler that owns the state.
3. Inspect the Elements panel for the node that should change. Check its attributes, DOM properties, and `data-matrix-scope` marker separately.
4. Use the Network panel to verify resource requests, response status, redirects, and aborted requests.
5. Use the Performance panel when an update is slow. Look for repeated event handlers, layout work, and large list reconciliation.
6. Test the same interaction after unmounting and remounting. A stale listener or effect often appears only on the second pass.

Serve the app over HTTP during debugging. Browser module imports can fail under `file://` before Matrix code gets a chance to run.

## Inspect one source

`inspect` reads a source without creating a new subscription:

```js
import { inspect, signal } from '@mickyballadelli/matrix'

const count = signal(0, { name: 'counter' })
console.table(inspect(count))
```

The result contains `kind`, the current `value`, subscriber and listener counts, and effect subscriber names. `peek()` is used for the value so inspection does not add a dependency.

## Watch updates

`watchDebug` creates an Effect that logs a source whenever it runs. It returns a stop function:

```js
import { inspectEffects, watchDebug } from '@mickyballadelli/matrix'

const stop = watchDebug(count, 'counter', console, {
  warnAfter: 100,
  redact: false
})

console.table(inspectEffects())

// Stop when the inspected view is gone.
stop()
```

Use `redact: true` for tokens, user data, and other values that should not appear in logs. Do not enable verbose logging in production without reviewing the data path.

## Create a configured logger

```js
import { createLogger } from '@mickyballadelli/matrix'

const logger = createLogger({
  enabled: true,
  logger: console,
  warnAfter: 1000,
  redact: true
})

const stop = logger.watch(count, 'counter')
console.log(logger.inspect(count))
```

When `enabled` is false, `logger.watch` returns a no-op cleanup function. This makes it safe to keep the setup in development code that is disabled by configuration.

## Understand queued work

Effects are synchronous by default. An Effect with `flush: 'microtask'`, or any update inside `batch`, runs after the current synchronous work. Use `flushJobs()` in a deterministic local test or debug harness after the state write.

```js
import { effect, flushJobs } from '@mickyballadelli/matrix'

effect(() => renderStatus(status.value), { flush: 'microtask' })
status.value = 'ready'
flushJobs()
```

Do not use `flushJobs()` as application control flow. Prefer waiting for the real event loop boundary in application code.

## Install a debug hook

`setDevtoolsHook` receives debug events emitted by `watchDebug`, renderer bindings, and hot-signal warnings:

```js
import { setDevtoolsHook } from '@mickyballadelli/matrix'

setDevtoolsHook(event => {
  if (event.type === 'signal:hot') {
    console.warn('Hot signal', event.name, event.count)
  }
})

// Remove the hook during teardown.
setDevtoolsHook()
```

Keep a hook cheap. It runs on the application update path.

## Common clues

- Subscriber count keeps growing: a temporary view, Effect, or subscription was not disposed.
- An Effect has too many dependencies: split the Effect or move unrelated reads into separate bindings.
- `signal:hot` repeats: inspect the event path and use `batch` for related writes.
- DOM is correct but CSS is wrong: inspect the scope marker, computed styles, and the injected style element.
- A route view is stale: inspect `router.current.value`, then confirm the view reads the router state through `routerView` or a Computed.
