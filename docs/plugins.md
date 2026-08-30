# Plugins and extension patterns

Matrix plugins are small lifecycle adapters. Use `usePlugin()` when you need
to observe renderer, scheduler, logger, or style events. Keep storage,
analytics, error reporting, and audits behind an adapter so the same app can
use a local implementation in development and a controlled service in
production.

```js
import { usePlugin } from '@mickyballadelli/matrix'

const stop = usePlugin({
  install(api) {
    const stopRenderer = api.on('renderer', event => {
      console.debug(event.type, event.kind)
    })
    return stopRenderer
  }
})

// Call stop() when the integration is no longer needed.
```

Hooks run synchronously on the update path. Do not make network requests,
read layout, or serialize large objects inside a hook. Queue that work or pass
it to an external adapter. Never retain DOM nodes, events, or reactive sources
after cleanup.

## Custom form input

Make a reusable input a component. Let the component own the label and ARIA
wiring while its parent owns the field signal and validator:

```js
function ValidatedInput({ id, label, field, error }) {
  return html`
    <label for=${id}>${label}
      <input id=${id} use:bind=${field}
        aria-describedby=${`${id}-error`}
        aria-invalid=${computed(() => Boolean(error.value))}>
      <span id=${`${id}-error`} role="alert">${error}</span>
    </label>
  `
}

const form = createForm({ email: '' }, {
  email: value => /@/.test(value) ? undefined : 'Enter a valid email'
})

html`${component(ValidatedInput, {
  id: 'email',
  label: 'Email',
  field: form.fields.email,
  error: computed(() => form.errors.value.email ?? '')
})}`
```

Validate on submit with `form.validate()`. Do not mutate component props; update
the owning form signal instead. See [Forms](./forms.md) and the runnable
[`custom-form-input` example](../examples/extensions/custom-form-input/index.html).

## State persistence

Signals expose `subscribe()`, so a persistence adapter can hydrate once and
write only the signal it owns:

```js
function createPersistencePlugin(source, storage, key) {
  return {
    hydrate() {
      const value = storage.getItem(key)
      if (value !== null) source.value = JSON.parse(value)
    },
    install() {
      return source.subscribe(value => {
        storage.setItem(key, JSON.stringify(value))
      })
    }
  }
}

const count = signal(0)
const persistence = createPersistencePlugin(count, localStorage, 'count')
persistence.hydrate()
const stop = usePlugin(persistence)
```

Catch malformed data and storage quota/security errors. Keep keys scoped to the
application, and do not persist secrets or values that must remain ephemeral.
The [state persistence example](../examples/extensions/state-persistence/index.html)
uses an injectable storage object for local testing.

## Analytics

Prefer explicit product events over attempting to infer user intent from every
DOM update. An analytics plugin can also observe safe lifecycle events:

```js
function createAnalyticsPlugin(send) {
  return {
    track(name, metadata = {}) {
      send({ name, metadata: { button: metadata.button } })
    },
    install(api) {
      return api.on('logger', event => {
        if (event.type === 'component:mount') {
          send({ name: 'matrix_component_mount', metadata: { component: event.name } })
        }
      })
    }
  }
}
```

Allowlist metadata, remove personal data, and protect the send callback from
breaking the UI. Disable or replace the transport when consent is absent. See
the [analytics example](../examples/extensions/analytics/index.html).

## Error reporting

The logger point receives `component:error` events before an error reaches a
parent `errorBoundary`. A reporter can also attach browser `error` and
`unhandledrejection` listeners:

```js
const reporter = {
  install(api) {
    const stop = api.on('logger', event => {
      if (event.type === 'component:error') {
        report({ type: 'component', name: event.name, message: event.message })
      }
    })
    return stop
  }
}

const stop = usePlugin(reporter)
```

Normalize errors before transport. Send a message, component name, and a
bounded stack when available; do not send live event objects, DOM nodes,
signals, form values, or access tokens. Keep an error boundary in the UI so a
reported failure still has a recoverable user experience. See the [error
reporting example](../examples/extensions/error-reporting/index.html).

## Accessibility audit

An audit plugin can run a small, project-specific check after renderer updates.
It does not replace keyboard, screen reader, contrast, zoom, or manual task
testing:

```js
const audit = {
  install(api) {
    return api.on('renderer', () => {
      queueMicrotask(() => checkNativeControls(root))
    })
  }
}

const stop = usePlugin(audit)
```

Check native semantics first: named buttons and links, labels for form
controls, `alt` on meaningful images, valid heading structure, and visible
focus. Report actionable rule IDs and keep the audit cheap. See the [a11y
audit example](../examples/extensions/a11y-audit/index.html) and the broader
[accessibility checklist](./accessibility.md).

## Performance monitoring

Use the scheduler and renderer points for low-cost counters. Measure a flush
with `performance.now()` and publish a snapshot outside the hook:

```js
const monitor = {
  install(api) {
    const stopRenderer = api.on('renderer', event => {
      if (event.type === 'dom:update') rendererUpdates += 1
    })
    const stopScheduler = api.on('scheduler', event => {
      if (event.type === 'flush:start') startedAt = performance.now()
      if (event.type === 'flush:end') lastFlushMs = performance.now() - startedAt
    })
    return () => {
      stopRenderer()
      stopScheduler()
    }
  }
}
```

Track broad trends and operation counts rather than treating one machine's
timing as a budget. Redact values, cap buffers, and turn monitoring off when
the application does not need it. See the [performance monitoring
example](../examples/extensions/performance-monitoring/index.html) and
[performance tips](./performance-tips.md).

## Cleanup and safety

Every `api.on()` returns an unregister function. `usePlugin()` returns a stop
function and runs plugin cleanup before removing registrations. Make cleanup
idempotent, remove global listeners, cancel timers, unsubscribe signals, and
dispose any Computeds or Signals created only for the integration.

Plugins observe Matrix; they do not replace the renderer or scheduler. Keep
the normal application path usable when a plugin is absent, disabled, or its
transport fails.
