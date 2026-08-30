import { component, computed, html, keyed, mount, signal } from '../../../src/index.js'

const DEFAULT_ITEMS = [
  { id: 'cached-1', title: 'Cached before the network returns' }
]

function readStored(storage, key, fallback) {
  try {
    const value = JSON.parse(storage?.getItem(key) ?? 'null')
    return Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function createOfflineFirstStore(options = {}) {
  const storage = options.storage ?? globalThis.localStorage
  const itemsKey = options.itemsKey ?? 'matrix-offline-items'
  const outboxKey = options.outboxKey ?? 'matrix-offline-outbox'
  const api = options.api ?? { save: async () => {} }
  const items = signal(options.initialItems ?? readStored(storage, itemsKey, DEFAULT_ITEMS.map(item => ({ ...item }))))
  const outbox = signal(options.initialOutbox ?? readStored(storage, outboxKey, []))
  const online = signal(options.online ?? true)
  const syncing = signal(false)
  const status = signal('')
  let nextId = 1

  function persist() {
    try {
      storage?.setItem(itemsKey, JSON.stringify(items.peek()))
      storage?.setItem(outboxKey, JSON.stringify(outbox.peek()))
    } catch (error) {
      status.value = `Could not save local data: ${error.message}`
    }
  }

  const stopItems = items.subscribe(persist)
  const stopOutbox = outbox.subscribe(persist)

  async function sync() {
    if (!online.value) {
      status.value = 'Offline · changes stay in the outbox'
      return false
    }
    if (syncing.value) return false
    const queued = outbox.peek().slice()
    if (queued.length === 0) {
      status.value = 'All local changes are synced'
      return true
    }

    syncing.value = true
    try {
      for (const item of queued) {
        await api.save(item)
        outbox.update(current => current.filter(entry => entry.id !== item.id))
      }
      status.value = 'All local changes are synced'
      return true
    } catch (error) {
      status.value = `Sync paused: ${error.message}`
      return false
    } finally {
      syncing.value = false
    }
  }

  function add(title) {
    const value = String(title).trim()
    if (!value) return false
    const item = { id: `offline-${Date.now()}-${nextId++}`, title: value }
    items.update(current => [...current, item])
    outbox.update(current => [...current, item])
    status.value = online.value ? 'Queued for sync' : 'Saved locally while offline'
    if (online.value) sync()
    return item
  }

  function setOnline(value) {
    online.value = Boolean(value)
    if (online.value) return sync()
    status.value = 'Offline · changes stay in the outbox'
    return Promise.resolve(false)
  }

  const onOnline = () => setOnline(true)
  const onOffline = () => setOnline(false)
  if (options.listenToWindow !== false) {
    globalThis.addEventListener?.('online', onOnline)
    globalThis.addEventListener?.('offline', onOffline)
  }

  return {
    api,
    items,
    outbox,
    online,
    syncing,
    status,
    add,
    sync,
    setOnline,
    dispose() {
      stopItems()
      stopOutbox()
      globalThis.removeEventListener?.('online', onOnline)
      globalThis.removeEventListener?.('offline', onOffline)
      items.dispose()
      outbox.dispose()
      online.dispose()
      syncing.dispose()
      status.dispose()
    }
  }
}

function OfflineItem({ item }) {
  return html`<li data-offline-item=${item.id}>${item.title}</li>`
}

export function mountOfflineFirstApp(container, options = {}) {
  const store = options.store ?? createOfflineFirstStore(options)
  const draft = signal('')
  const itemRows = computed(() => store.items.value.map(item => component(OfflineItem, { item }, item.id)))
  const state = computed(() => `${store.online.value ? 'Online' : 'Offline'} · ${store.outbox.value.length} pending change(s)`)

  function addItem(event) {
    event.preventDefault()
    if (store.add(draft.value)) draft.value = ''
  }

  const app = mount(() => html`
    <main class="integration-example">
      <p class="eyebrow">Integration pattern</p>
      <h1>Offline-first application</h1>
      <p>Render local data first, queue mutations, and flush the outbox when connectivity returns.</p>
      <p data-offline-state class="muted">${state}</p>
      <form data-offline-form @submit=${addItem}>
        <label>New item <input data-offline-input placeholder="Write while offline" use:bind=${draft}></label>
        <div class="actions">
          <button data-offline-add type="submit">Save locally</button>
          <button data-offline-toggle class="secondary" type="button" @click=${() => store.setOnline(!store.online.value)}>${computed(() => store.online.value ? 'Go offline' : 'Go online')}</button>
          <button data-offline-sync class="secondary" type="button" @click=${store.sync} ?disabled=${store.syncing}>Sync now</button>
        </div>
      </form>
      <p data-offline-status class="status" aria-live="polite">${store.status}</p>
      <ul data-offline-items class="item-list">${keyed(itemRows, item => item.key)}</ul>
    </main>
  `, container)

  return {
    app,
    store,
    draft,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      itemRows.dispose()
      state.dispose()
      draft.dispose()
      if (!options.store) store.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountOfflineFirstApp(document.querySelector('#app'))
}
