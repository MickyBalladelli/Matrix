import { mountDebounceThrottleApp } from '../examples/integration-patterns/debounce-throttle/app.js'
import { mountInfiniteScrollApp } from '../examples/integration-patterns/infinite-scroll/app.js'
import { mountOfflineFirstApp } from '../examples/integration-patterns/offline-first/app.js'
import { mountRealtimeCollaborationApp } from '../examples/integration-patterns/realtime-collaboration/app.js'
import { mountResourceCacheApp } from '../examples/integration-patterns/resource-cache/app.js'
import { mountUndoRedoApp } from '../examples/integration-patterns/undo-redo/app.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}
const createHost = name => {
  const host = document.createElement('div')
  host.dataset.integrationPattern = name
  document.body.append(host)
  return host
}

const cacheHost = createHost('resource-cache')
let searchCalls = 0
const cacheApp = mountResourceCacheApp(cacheHost, {
  api: {
    async search(query) {
      searchCalls += 1
      return { query, items: [`Result for ${query}`] }
    }
  },
  query: 'matrix'
})
await cacheApp.ready
assert(searchCalls === 1, 'Resource cache must load the first query')
await cacheApp.load()
assert(searchCalls === 1, 'Resource cache must reuse a successful result')
cacheApp.query.value = 'router'
await cacheApp.load()
assert(searchCalls === 2 && cacheApp.cached.cache.size === 2, 'Resource cache must key distinct queries')
assert(cacheHost.querySelector('[data-cache-item]').textContent.includes('router'), 'Resource cache must render the current result')
cacheApp.dispose()
cacheHost.remove()

const rateHost = createHost('debounce-throttle')
const rateApp = mountDebounceThrottleApp(rateHost, { debounce: 15, throttle: 15 })
setInputValue(rateHost.querySelector('[data-rate-raw]'), 'a')
setInputValue(rateHost.querySelector('[data-rate-raw]'), 'ab')
setInputValue(rateHost.querySelector('[data-rate-raw]'), 'abc')
assert(rateApp.raw.value === 'abc', 'Rate-limited example must keep raw input immediate')
await wait(25)
assert(rateApp.debounced.value === 'abc', 'Debounced signal must emit after input settles')
assert(rateApp.throttled.value === 'abc', 'Throttled signal must emit the latest pending value')
rateApp.dispose()
rateHost.remove()

const historyHost = createHost('undo-redo')
const historyApp = mountUndoRedoApp(historyHost)
setInputValue(historyHost.querySelector('[data-history-input]'), 'one')
setInputValue(historyHost.querySelector('[data-history-input]'), 'two')
historyHost.querySelector('[data-history-undo]').click()
assert(historyApp.history.value.value === 'one', 'Undo must restore the previous signal value')
historyHost.querySelector('[data-history-redo]').click()
assert(historyApp.history.value.value === 'two', 'Redo must restore the undone value')
setInputValue(historyHost.querySelector('[data-history-input]'), 'three')
assert(!historyApp.history.redo(), 'A new edit must clear redo history')
historyApp.dispose()
historyHost.remove()

const feedHost = createHost('infinite-scroll')
const feedApp = mountInfiniteScrollApp(feedHost, {
  api: {
    async load(page) {
      return {
        items: [1, 2].map(index => ({ id: `${page}-${index}`, name: `Page ${page} item ${index}` })),
        hasMore: page < 2
      }
    }
  },
  disableObserver: true
})
await feedApp.ready
assert(feedApp.items.value.length === 2 && feedApp.page.value === 1, 'Infinite scroll must load its first page')
await feedApp.loadNext()
assert(feedApp.items.value.length === 4 && feedApp.router.search.value === '?page=2', 'Infinite scroll must append and bookmark the next page')
feedApp.dispose()
feedHost.remove()

const sentMessages = []
const collaborationListeners = new Set()
const transport = {
  async connect() {
    return { peerCount: 2 }
  },
  subscribe(listener) {
    collaborationListeners.add(listener)
    return () => collaborationListeners.delete(listener)
  },
  send(message) {
    sentMessages.push(message)
    queueMicrotask(() => {
      for (const listener of collaborationListeners) listener({ ...message, clientId: 'remote', author: 'Remote peer' })
    })
  },
  close() {
    collaborationListeners.clear()
  }
}
const collaborationHost = createHost('realtime-collaboration')
const collaborationApp = mountRealtimeCollaborationApp(collaborationHost, { transport, clientId: 'local' })
await collaborationApp.ready
setInputValue(collaborationHost.querySelector('[data-collab-input]'), 'shared text')
await wait(0)
assert(sentMessages[0]?.text === 'shared text', 'Collaboration must publish validated edits through its transport')
assert(collaborationApp.remoteEdits.value === 1, 'Collaboration must apply remote messages to a signal')
assert(collaborationHost.querySelector('[data-collab-presence]').textContent.includes('2 peer'), 'Collaboration must render transport presence')
collaborationApp.dispose()
collaborationHost.remove()

const offlineStorageValues = new Map()
const offlineStorage = {
  getItem(key) {
    return offlineStorageValues.get(key) ?? null
  },
  setItem(key, value) {
    offlineStorageValues.set(key, String(value))
  }
}
const savedItems = []
const offlineHost = createHost('offline-first')
const offlineApp = mountOfflineFirstApp(offlineHost, {
  storage: offlineStorage,
  online: false,
  listenToWindow: false,
  initialItems: [{ id: 'cached', title: 'Cached item' }],
  api: { save: async item => savedItems.push(item) }
})
await offlineApp.ready
setInputValue(offlineHost.querySelector('[data-offline-input]'), 'Queued item')
offlineHost.querySelector('[data-offline-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
assert(offlineApp.store.outbox.value.length === 1, 'Offline-first writes must enter the outbox')
await offlineApp.store.setOnline(true)
assert(savedItems[0]?.title === 'Queued item' && offlineApp.store.outbox.value.length === 0, 'Offline-first sync must flush queued writes')
offlineApp.dispose()
offlineHost.remove()

document.body.dataset.matrixIntegrationPatterns = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
