import { component, computed, html, keyed, mount, resource, signal } from '../../../src/index.js'

const DEFAULT_RESULTS = {
  matrix: ['Signals', 'Components', 'Resources'],
  router: ['Routes', 'Guards', 'Links']
}

export function createResourceApi(options = {}) {
  const results = options.results ?? DEFAULT_RESULTS
  const delay = options.delay ?? 20
  return {
    async search(query, abortSignal) {
      if (delay) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay)
          const cancel = () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
          }
          if (abortSignal?.aborted) cancel()
          else abortSignal?.addEventListener('abort', cancel, { once: true })
        })
      }
      return { query, items: [...(results[query] ?? [`No result for ${query}`])] }
    }
  }
}

export function createCachedResource(loader, options = {}) {
  if (typeof loader !== 'function') {
    throw new TypeError('createCachedResource() expects a loader function')
  }

  const cache = options.cache ?? new Map()
  const keyFor = options.key ?? ((...values) => JSON.stringify(values))
  const state = resource(async (...values) => {
    const abortSignal = values.pop()
    const key = keyFor(...values)
    if (cache.has(key)) return cache.get(key)
    const result = await loader(...values, abortSignal)
    cache.set(key, result)
    return result
  }, { initialValue: options.initialValue ?? null })

  return {
    ...state,
    cache,
    clear() {
      cache.clear()
    }
  }
}

function ResultRow({ item }) {
  return html`<li data-cache-item>${item}</li>`
}

export function mountResourceCacheApp(container, options = {}) {
  const api = options.api ?? createResourceApi()
  const query = signal(options.query ?? 'matrix')
  const cached = createCachedResource((value, abortSignal) => api.search(value, abortSignal), {
    cache: options.cache,
    initialValue: options.initialData ?? null
  })
  const cacheRevision = signal(0)
  const items = computed(() => cached.data.value?.items ?? [])
  const rows = computed(() => items.value.map((item, index) => component(ResultRow, { item }, index)))
  const status = computed(() => {
    cacheRevision.value
    return cached.loading.value
      ? 'Loading…'
      : cached.error.value
        ? 'Could not load results'
        : `${items.value.length} result(s) · ${cached.cache.size} cached key(s)`
  })

  function load() {
    return cached.reload(query.value).catch(() => undefined)
  }

  function clearCache() {
    cached.clear()
    cacheRevision.update(value => value + 1)
  }

  const app = mount(() => html`
    <main class="integration-example">
      <p class="eyebrow">Integration pattern</p>
      <h1>Resource loading and cache</h1>
      <p><code>resource()</code> owns cancellation and status; a small cache avoids repeating successful requests.</p>
      <label>Query <input data-cache-query use:bind=${query}></label>
      <div class="actions">
        <button data-cache-load @click=${load}>Load results</button>
        <button data-cache-clear class="secondary" @click=${clearCache}>Clear cache</button>
      </div>
      <p data-cache-status class="status" aria-live="polite">${status}</p>
      <ul data-cache-results class="item-list">${keyed(rows, item => item.key)}</ul>
    </main>
  `, container)
  const ready = load()

  return {
    app,
    api,
    query,
    cached,
    items,
    ready,
    load,
    dispose() {
      app.unmount()
      cached.dispose()
      items.dispose()
      rows.dispose()
      status.dispose()
      cacheRevision.dispose()
      query.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountResourceCacheApp(document.querySelector('#app'))
}
