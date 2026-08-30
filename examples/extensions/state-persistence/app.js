import { computed, html, mount, signal, usePlugin } from '../../../src/index.js'

export function createStatePersistencePlugin(source, options = {}) {
  if (!source || source.kind !== 'signal' || typeof source.subscribe !== 'function' || typeof source.peek !== 'function' || typeof source.set !== 'function') {
    throw new TypeError('State persistence expects a writable signal')
  }

  const storage = options.storage ?? globalThis.localStorage
  const key = options.key ?? 'matrix-extension-state'
  const serialize = options.serialize ?? JSON.stringify
  const deserialize = options.deserialize ?? JSON.parse
  const onError = options.onError ?? (() => {})

  function hydrate() {
    if (!storage) {
      return source.peek()
    }

    try {
      const stored = storage.getItem(key)
      if (stored !== null) {
        source.value = deserialize(stored)
      }
    } catch (error) {
      onError(error)
    }
    return source.peek()
  }

  function persist(value) {
    if (!storage) {
      return
    }

    try {
      storage.setItem(key, serialize(value))
    } catch (error) {
      onError(error)
    }
  }

  return {
    hydrate,
    install(api) {
      const stopSource = source.subscribe(value => persist(value))
      const stopScheduler = api.on('scheduler', event => {
        if (event.type === 'flush:end') {
          persist(source.peek())
        }
      })
      return () => {
        stopSource()
        stopScheduler()
      }
    }
  }
}

export function mountStatePersistenceApp(container, options = {}) {
  const count = signal(options.initialValue ?? 0, { name: 'persisted-count' })
  const persistence = options.persistence ?? createStatePersistencePlugin(count, {
    storage: options.storage,
    key: options.key,
    onError: options.onError
  })
  persistence.hydrate()
  const stopPersistence = usePlugin(persistence)
  const doubled = computed(() => count.value * 2)

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>State persistence plugin</h1>
      <p>The signal hydrates once, then writes changes through an injectable storage adapter.</p>
      <p data-persist-count>Count: ${count}</p>
      <p class="muted">Double: ${doubled}</p>
      <div class="actions">
        <button data-persist-add @click=${() => count.update(value => value + 1)}>Add</button>
        <button data-persist-reset class="secondary" @click=${() => count.value = 0}>Reset</button>
      </div>
    </main>
  `, container)

  return {
    app,
    count,
    doubled,
    persistence,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      stopPersistence()
      doubled.dispose()
      count.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountStatePersistenceApp(document.querySelector('#app'))
}
