# Integration patterns

These small pages show how to combine Matrix primitives with application
services. Each pattern is dependency-free and can be opened through a local
static server:

```text
examples/integration-patterns/resource-cache/index.html
examples/integration-patterns/debounce-throttle/index.html
examples/integration-patterns/undo-redo/index.html
examples/integration-patterns/infinite-scroll/index.html
examples/integration-patterns/realtime-collaboration/index.html
examples/integration-patterns/offline-first/index.html
```

The local browser fixture is `test/integration-patterns.browser.html`. It uses
in-memory adapters and checks the visible result of every pattern without a
network service.

## Patterns

- **Resource cache**: cache successful loader results by request key while
  keeping cancellation and loading state in `resource()`.
- **Debounce/throttle**: keep raw input responsive while exposing delayed or
  rate-limited signals to expensive consumers.
- **Undo/redo**: wrap a writable signal with bounded history and clear redo
  state after a new edit.
- **Infinite scroll**: combine a router query, a cancellable page resource,
  and an `IntersectionObserver` with a button fallback.
- **Real-time collaboration**: keep transport messages behind a small adapter,
  apply remote edits as data, and clean up subscriptions.
- **Offline-first**: render cached data immediately, queue writes locally, and
  flush the outbox when connectivity returns.

Use the examples as boundaries, not as a global state framework. Keep service
clients injectable, validate remote payloads before rendering, and dispose
resources, routers, timers, and transport listeners with the application.
