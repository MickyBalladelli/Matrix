import { component, computed, createRouter, html, keyed, mount, onMount, resource, routerView, signal } from '../../../src/index.js'

const DEFAULT_ITEMS = ['Ada', 'Boudica', 'Cato', 'Dido', 'Enki', 'Freyja', 'Gaia', 'Hector', 'Inez']

export function createFeedApi(options = {}) {
  const names = options.items ?? DEFAULT_ITEMS
  const pageSize = options.pageSize ?? 3
  const delay = options.delay ?? 15
  return {
    async load(page, abortSignal) {
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
      const start = (page - 1) * pageSize
      return {
        items: names.slice(start, start + pageSize).map((name, index) => ({
          id: `feed-${start + index}`,
          name
        })),
        hasMore: start + pageSize < names.length
      }
    }
  }
}

function FeedItem({ item }) {
  return html`<li data-feed-item=${item.id}>${item.name}</li>`
}

export function mountInfiniteScrollApp(container, options = {}) {
  const api = options.api ?? createFeedApi()
  const router = createRouter([{ path: '/feed', view: FeedPage }])
  const page = signal(0)
  const items = signal([])
  const hasMore = signal(true)
  const status = signal('')
  const loading = signal(false)
  const pageResource = resource((nextPage, abortSignal) => api.load(nextPage, abortSignal), { initialValue: null })
  const itemRows = computed(() => items.value.map(item => component(FeedItem, { item }, item.id)))
  const statusText = computed(() => loading.value
    ? 'Loading more…'
    : status.value || `${items.value.length} item(s) loaded`)

  async function loadNext() {
    if (loading.value || !hasMore.value) return false
    loading.value = true
    const nextPage = page.value + 1
    try {
      const result = await pageResource.reload(nextPage)
      if (!result) return false
      items.update(current => [...current, ...result.items])
      page.value = nextPage
      hasMore.value = result.hasMore
      status.value = result.hasMore ? '' : 'All items loaded'
      await router.navigate(`/feed?page=${nextPage}`, { replace: true, scroll: false })
      return true
    } catch {
      status.value = 'Could not load the next page'
      return false
    } finally {
      loading.value = false
    }
  }

  function FeedPage() {
    return html`
      <section data-feed-page>
        <p data-feed-page-number>Page ${page}</p>
        <ul data-feed-items class="item-list">${keyed(itemRows, item => item.key)}</ul>
        <div data-feed-sentinel aria-hidden="true"></div>
        <button data-feed-more ?disabled=${computed(() => loading.value || !hasMore.value)} @click=${loadNext}>${computed(() => hasMore.value ? 'Load more' : 'No more items')}</button>
      </section>
    `
  }

  const activeView = routerView(router, () => html`<p>Feed route not found.</p>`)
  const app = mount(() => {
    onMount(root => {
      if (options.disableObserver || typeof IntersectionObserver !== 'function') return
      const sentinel = root.querySelector('[data-feed-sentinel]')
      if (!sentinel) return
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) loadNext()
      }, { rootMargin: '160px' })
      observer.observe(sentinel)
      return () => observer.disconnect()
    })
    return html`
      <main class="integration-example">
        <p class="eyebrow">Integration pattern</p>
        <h1>Infinite scroll with a router</h1>
        <p>Page state lives in signals, data loading is cancellable, and the URL records the last loaded page.</p>
        <p data-feed-status class="status" aria-live="polite">${statusText}</p>
        ${activeView}
        <p class="muted">Scroll to the sentinel or use the button when an observer is unavailable.</p>
      </main>
    `
  }, container)
  router.start()
  const ready = (router.current.peek()
    ? Promise.resolve()
    : router.navigate('/feed', { replace: true, scroll: false }))
    .then(() => loadNext())

  return {
    app,
    api,
    router,
    page,
    items,
    hasMore,
    loading,
    pageResource,
    ready,
    loadNext,
    dispose() {
      app.unmount()
      router.dispose()
      pageResource.dispose()
      itemRows.dispose()
      statusText.dispose()
      page.dispose()
      items.dispose()
      hasMore.dispose()
      status.dispose()
      loading.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountInfiniteScrollApp(document.querySelector('#app'))
}
