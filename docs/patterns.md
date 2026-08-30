# Integration patterns

Matrix is deliberately small. Combine its Signals, Computeds, Resources,
router, and DOM bindings with application-owned adapters at the boundary where
data enters or leaves the app.

Keep adapters injectable. The local browser fixture at
[`test/integration-patterns.browser.html`](../test/integration-patterns.browser.html)
uses in-memory implementations for every pattern, so it never needs a
network, server, or browser storage.

## Loading and caching with `resource()`

Use `resource()` for loading state, cancellation, errors, and disposal. Put a
small cache in front of the loader when successful results can be reused:

```js
import { resource } from '@mickyballadelli/matrix'

function createCachedResource(loader) {
  const cache = new Map()
  const state = resource(async (key, requestSignal) => {
    if (cache.has(key)) return cache.get(key)
    const value = await loader(key, requestSignal)
    cache.set(key, value)
    return value
  })

  return {
    ...state,
    cache,
    clear: () => cache.clear()
  }
}
```

Cache only validated successful values. Include every input that changes the
response in the key, pass the `AbortSignal` to `fetch`, and avoid caching
authentication or tenant data in a shared module-level map. See the
[resource cache example](../examples/integration-patterns/resource-cache/index.html)
and [async loading](./common-patterns.md#async-loading).

## Debouncing and throttling Signals

Keep the raw input separate from the value used by an expensive consumer.
Debouncing emits after changes stop; throttling emits at most once per
interval:

```js
function debouncedSignal(source, delay) {
  const output = signal(source.peek())
  let timer
  const stop = source.subscribe(value => {
    clearTimeout(timer)
    timer = setTimeout(() => { output.value = value }, delay)
  })
  return () => {
    clearTimeout(timer)
    stop()
    output.dispose()
  }
}
```

Cancel timers on disposal. Use the raw Signal for the input control and the
debounced Signal for search requests. Use throttling for bounded-rate progress
or telemetry, not as a replacement for validation. See the
[debounce/throttle example](../examples/integration-patterns/debounce-throttle/index.html).

## Undo and redo with Signals

Wrap a writable Signal instead of teaching every component about history:

```js
function historySignal(initial) {
  const value = signal(initial)
  const past = []
  const future = []

  return {
    value,
    set(next) {
      if (Object.is(value.peek(), next)) return
      past.push(value.peek())
      future.length = 0
      value.value = next
    },
    undo() {
      if (!past.length) return false
      future.push(value.peek())
      value.value = past.pop()
      return true
    },
    redo() {
      if (!future.length) return false
      past.push(value.peek())
      value.value = future.pop()
      return true
    }
  }
}
```

Bound the history for long-lived editors. A new edit clears the redo stack;
undo and redo should move the same source of truth so every view updates.
Dispose the source and any derived `canUndo`/`canRedo` Computeds with the
editor. See the [undo/redo example](../examples/integration-patterns/undo-redo/index.html).

## Infinite scroll with router and Signals

Keep the loaded rows and page number in Signals. Load the next page through a
Resource, record the page in the URL, and use an explicit button as a fallback
for browsers or users where an observer is unavailable:

```js
const router = createRouter([{ path: '/feed', view: Feed }])
const page = signal(0)
const rows = signal([])
const nextPage = resource((number, requestSignal) => api.load(number, requestSignal))

async function loadMore() {
  if (nextPage.loading.value) return false
  const number = page.value + 1
  const result = await nextPage.reload(number)
  rows.update(current => [...current, ...result.items])
  page.value = number
  await router.navigate(`/feed?page=${number}`, { replace: true, scroll: false })
  return true
}
```

Use stable row keys, guard concurrent loads, stop observing the sentinel on
unmount, and handle the end-of-list and failed-request states. The URL is a
resume point, not permission control. See the
[infinite scroll example](../examples/integration-patterns/infinite-scroll/index.html).

## Real-time collaboration

Keep WebSocket, BroadcastChannel, or a hosted realtime SDK behind a transport
with `connect`, `subscribe`, `send`, and `close`. Convert incoming messages to
validated application data before writing Signals:

```js
const stop = transport.subscribe(message => {
  if (message.type !== 'edit' || typeof message.text !== 'string') return
  documentText.value = message.text
})

function publishEdit(text) {
  transport.send({ type: 'edit', text, clientId })
}

// On teardown:
stop()
transport.close()
```

The example transport echoes a remote peer locally. A production app still
needs identity, authorization, conflict resolution, ordering/version checks,
reconnect backoff, and bounded message sizes. Never trust a remote client ID
or render a received payload as raw HTML. See the
[realtime collaboration example](../examples/integration-patterns/realtime-collaboration/index.html).

## Offline-first applications

Render cached data immediately and treat writes as local first. Keep an outbox
for server mutations, then retry it when connectivity returns:

```js
const items = signal(readCache('items', []))
const outbox = signal(readCache('outbox', []))
const online = signal(true)

async function sync() {
  if (!online.value) return false
  for (const item of outbox.peek()) {
    await api.save(item)
    outbox.update(queue => queue.filter(entry => entry.id !== item.id))
  }
  return true
}
```

Persist the cache and outbox separately, keep mutations idempotent, and retain
failed entries for retry or user action. Handle quota errors, schema versions,
conflicts, logout, and sensitive data explicitly. Browser online events are a
hint; the API response decides whether synchronization succeeded. See the
[offline-first example](../examples/integration-patterns/offline-first/index.html).

## Cleanup and local testing

Every long-lived integration needs an owner:

- dispose Resources, Signals, Computeds, and Routers created outside a
  component scope;
- clear debounce/throttle timers and disconnect observers;
- unsubscribe transport listeners and close sockets;
- remove online/offline listeners;
- keep storage and service clients injectable.

Run the deterministic integration fixture locally:

```bash
npm run test:browser:integration-patterns
```

It verifies cache hits, delayed signals, history transitions, page loading,
remote edits, and offline outbox synchronization in a real browser.
