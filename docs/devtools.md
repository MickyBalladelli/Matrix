# DevTools integration

Matrix exposes a runtime inspector bridge for the unpacked browser extension in `devtools/`, a VS Code helper in `vscode/`, and custom local inspectors. These tools collect the same snapshots without changing the rendering path.

## Install the browser panel

Call `createDevtools()` once during application startup:

```js
import { configure, createDevtools } from '@mickyballadelli/matrix'

configure({ development: true })
createDevtools({ redact: true, recordTimeline: false })
```

Load the repository's `devtools/` directory as an unpacked extension in Chrome, Edge, or Firefox. Open the page's browser DevTools and select the Matrix panel. The panel reads `window.__MATRIX_DEVTOOLS__` and shows the component tree, Signals and Computeds, Effect dependency edges, router state, and timeline events.

## Plugin extension points

`usePlugin` accepts four points:

- `renderer`: DOM content and attribute updates.
- `scheduler`: jobs scheduled and flush boundaries.
- `logger`: debug events, signal updates, hot-signal warnings, and runtime diagnostics.
- `style`: style application and disposal.

Each `api.on()` call returns an unregister function. The plugin's optional cleanup runs before its registrations are removed.

```js
import { usePlugin } from '@mickyballadelli/matrix'

const stopPlugin = usePlugin({
  install(api) {
    const stopRenderer = api.on('renderer', event => {
      console.debug('[renderer]', event.type, event)
    })
    const stopScheduler = api.on('scheduler', event => {
      console.debug('[scheduler]', event.type, event)
    })

    return () => {
      stopRenderer()
      stopScheduler()
    }
  }
})

stopPlugin()
```

Register a plugin only when needed. Hooks run synchronously on the update path, so avoid network requests, layout reads, and expensive serialization inside a hook.

## Event shapes

The public event `type` values currently include:

| Point | Event types | Useful fields |
| --- | --- | --- |
| `renderer` | `dom:update` | `kind`, `element` or `parent`, `name` or `source` |
| `scheduler` | `job:scheduled`, `flush:start`, `flush:end` | `flush`, `size` |
| `logger` | `signal:update`, `signal:hot`, debug DOM events, and runtime diagnostics | `name`, `value`, `source`, `count`, `stack`, diagnostic-specific fields |
| `style` | `style:apply`, `style:dispose` | `element`, `definition` |

Event objects are intentionally open-ended. Read the `type` first and treat optional fields defensively.

## Build a small inspector bridge

This bridge sends safe event summaries to a devtools page. Keep live Signal objects out of messages; they can contain references to the application graph.

```js
import { usePlugin } from '@mickyballadelli/matrix'

const summarize = event => ({
  type: event.type,
  name: event.name,
  kind: event.kind,
  count: event.count,
  flush: event.flush,
  size: event.size
})

const stop = usePlugin({
  install(api) {
    const points = ['renderer', 'scheduler', 'logger', 'style']
    const unregister = points.map(point => api.on(point, event => {
      window.postMessage({ source: 'matrix-devtools', event: summarize(event) }, window.location.origin)
    }))

    return () => unregister.forEach(remove => remove())
  }
})
```

The receiver should validate `event.origin`, accept only the expected `source`, and avoid displaying sensitive signal values. Prefer `redact: true` with `watchDebug` when values are not needed.

## Runtime inspector API

`createDevtools()` returns a small protocol object and also exposes it as `window.__MATRIX_DEVTOOLS__` by default:

```js
const devtools = createDevtools({ redact: false })

console.log(devtools.components())
console.log(devtools.sources())
console.log(devtools.effects())
console.log(devtools.routers())

devtools.timeline.start()
// Interact with the app.
devtools.timeline.stop()
console.table(devtools.timeline.snapshot())
```

Use `redact: true` when values contain user data. Timeline entries keep event metadata and safe value previews, never DOM nodes or live reactive objects.

## Source inspection

Use `inspect(source)` for one source and `inspectEffects()` for active Effect names and dependency counts. These helpers are best for an in-app debug panel or a paused console session. Call cleanup functions when the panel closes.

`setDevtoolsHook` is a lighter alternative for debug events only:

```js
import { setDevtoolsHook } from '@mickyballadelli/matrix'

setDevtoolsHook(event => {
  window.dispatchEvent(new CustomEvent('matrix-debug', { detail: {
    type: event.type,
    name: event.name
  }}))
})
```

It does not receive scheduler or style plugin events. Use `usePlugin` when an inspector needs those points too.

## VS Code

The `vscode/` directory contains a local extension that evaluates the same bridge through the active JavaScript debug session. Install it from that directory, start a browser debug session, then run **Matrix: Inspect Active Page** from the Command Palette. Use the two Matrix timeline commands to record an interaction.

## Extension boundaries

- Plugins observe Matrix; they do not replace the scheduler or renderer.
- Do not mutate event objects or internal source objects.
- Do not keep DOM nodes or Signal objects alive after the inspected view is unmounted.
- Disable instrumentation in production unless the data and overhead are understood.
- The inspector snapshot protocol is versioned as `1`; treat fields as additive and expect changes before 1.0.
