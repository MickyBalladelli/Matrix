import { mountShoppingCartApp } from '../examples/shopping-cart/app.js'
import { mountNotesApp } from '../examples/notes/app.js'
import { mountDashboardApp } from '../examples/dashboard/app.js'
import { mountChatApp } from '../examples/chat/app.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

const createHost = name => {
  const host = document.createElement('div')
  host.dataset.exampleTest = name
  document.body.append(host)
  return host
}

// Shopping Cart: API boundary, product state, routing, form validation, and order submission.
const originalUrl = window.location.href
const shopHost = createHost('shopping-cart')
const orderCalls = []
const shopping = mountShoppingCartApp(shopHost, {
  api: {
    async listProducts() {
      return [
        { id: 'mug', name: 'Test mug', price: 10, description: 'A test product' },
        { id: 'sticker', name: 'Test sticker', price: 4, description: 'A second product' }
      ]
    },
    async submitOrder(order) {
      orderCalls.push(order)
      return { id: 'test-order', ...order }
    }
  }
})
await shopping.ready
assert(shopHost.querySelector('[data-product="mug"]'), 'Shopping Cart must render API products')
shopHost.querySelector('[data-product="mug"]').click()
assert(shopHost.querySelector('[data-cart-count]').textContent === '1', 'Shopping Cart must update cart state')
assert(await shopping.router.navigate('/checkout'), 'Shopping Cart must navigate to checkout')
setInputValue(shopHost.querySelector('[data-checkout-email]'), 'shopper@example.com')
setInputValue(shopHost.querySelector('[data-checkout-address]'), '1 Matrix Way')
shopHost.querySelector('[data-checkout-submit]').click()
await wait(0)
assert(orderCalls.length === 1 && orderCalls[0].customer.email === 'shopper@example.com', 'Shopping Cart must submit validated order data')
assert(shopHost.querySelector('[data-order-status]').textContent === 'Order sent successfully', 'Shopping Cart must show order status')
shopping.dispose()
shopHost.remove()
window.history.replaceState({}, '', originalUrl)

// Notes App: complex editor form, search, persistence, and reloading stored data.
const noteStorageValues = new Map([
  ['notes-test', JSON.stringify([
    { id: 'one', title: 'Matrix basics', body: 'Signals and Computeds', tags: ['guide'] },
    { id: 'two', title: 'Release plan', body: 'Ship the notes app', tags: ['work'] }
  ])]
])
const noteStorage = {
  getItem(key) {
    return noteStorageValues.get(key) ?? null
  },
  setItem(key, value) {
    noteStorageValues.set(key, value)
  }
}
const notesHost = createHost('notes')
const notes = mountNotesApp(notesHost, { storage: noteStorage, storageKey: 'notes-test' })
assert(notesHost.querySelector('[data-note-count]').textContent === '2 note(s)', 'Notes App must load stored notes')
setInputValue(notesHost.querySelector('[data-note-search]'), 'matrix')
assert(notesHost.querySelectorAll('[data-note-select]').length === 1, 'Notes App search must filter note rows')
notesHost.querySelector('[data-note-new]').click()
notesHost.querySelector('[data-note-save]').click()
assert(notesHost.querySelector('.error')?.textContent === 'Title is required', 'Notes App must validate complex editor fields')
setInputValue(notesHost.querySelector('[data-note-title]'), 'New idea')
setInputValue(notesHost.querySelector('[data-note-body]'), 'Compose a better dashboard')
setInputValue(notesHost.querySelector('[data-note-tags]'), 'ideas, matrix')
notesHost.querySelector('[data-note-save]').click()
assert(notesHost.querySelector('[data-note-status]').textContent === 'Saved locally', 'Notes App must save a valid note')
assert(JSON.parse(noteStorage.getItem('notes-test')).some(note => note.title === 'New idea'), 'Notes App must persist notes')
notes.dispose()
notesHost.remove()

const restoredNotesHost = createHost('notes-restored')
const restoredNotes = mountNotesApp(restoredNotesHost, { storage: noteStorage, storageKey: 'notes-test' })
assert(restoredNotesHost.textContent.includes('New idea'), 'Notes App must restore persisted notes')
restoredNotes.dispose()
restoredNotesHost.remove()

// Dashboard: many keyed components, filtered activity, reloadable data, and timeline capture.
const dashboardHost = createHost('dashboard')
const dashboardRanges = []
const dashboard = mountDashboardApp(dashboardHost, {
  api: {
    async load(range) {
      dashboardRanges.push(range)
      return {
        metrics: [
          { id: 'orders', label: 'Orders', value: '42', change: '+4%', tone: 'positive' },
          { id: 'errors', label: 'Errors', value: '2', change: '+1%', tone: 'warning' }
        ],
        trend: [20, 40, 60],
        activity: [
          { id: 'ok', actor: 'Ada', action: 'deployed', status: 'success' },
          { id: 'bad', actor: 'Cato', action: 'failed request', status: 'error' }
        ]
      }
    }
  }
})
await dashboard.ready
assert(dashboardHost.querySelector('[data-dashboard-metric="orders"]'), 'Dashboard must render metric components')
assert(dashboardHost.querySelectorAll('[data-dashboard-bar]').length === 3, 'Dashboard must render its trend components')
const dashboardFilter = dashboardHost.querySelector('[data-dashboard-filter]')
dashboardFilter.value = 'error'
dashboardFilter.dispatchEvent(new Event('change', { bubbles: true }))
assert(dashboardHost.querySelectorAll('[data-dashboard-activity]').length === 1, 'Dashboard activity filter must update keyed rows')
const dashboardRange = dashboardHost.querySelector('[data-dashboard-range]')
dashboardRange.value = '30d'
dashboardRange.dispatchEvent(new Event('change', { bubbles: true }))
await wait(0)
assert(dashboardRanges.includes('30d'), 'Dashboard must reload data for a new range')
dashboardHost.querySelector('[data-dashboard-record]').click()
assert(dashboard.timeline.isRecording, 'Dashboard must start performance recording')
dashboardHost.querySelector('[data-dashboard-record]').click()
assert(!dashboard.timeline.isRecording, 'Dashboard must stop performance recording')
dashboard.dispose()
dashboardHost.remove()

// Real-time Chat: WebSocket lifecycle, outbound messages, and inbound message handling.
const chatListeners = new Map()
const sentMessages = []
const chatSocket = {
  readyState: 1,
  addEventListener(type, listener) {
    const listeners = chatListeners.get(type) ?? new Set()
    listeners.add(listener)
    chatListeners.set(type, listeners)
  },
  removeEventListener(type, listener) {
    chatListeners.get(type)?.delete(listener)
  },
  send(message) {
    sentMessages.push(JSON.parse(message))
  },
  close() {
    chatSocket.readyState = 3
  },
  emit(type, event) {
    for (const listener of chatListeners.get(type) ?? []) {
      listener(event)
    }
  }
}
const chatHost = createHost('chat')
const chat = mountChatApp(chatHost, { socket: chatSocket })
await chat.ready
assert(chatHost.querySelector('[data-chat-status]').textContent === 'connected', 'Chat must show an open WebSocket')
setInputValue(chatHost.querySelector('[data-chat-input]'), 'Hello server')
chatHost.querySelector('[data-chat-send]').click()
assert(sentMessages[0].text === 'Hello server', 'Chat must send serialized messages')
chatSocket.emit('message', { data: JSON.stringify({ type: 'message', id: 'remote-1', author: 'Server', text: 'Hello client' }) })
await wait(0)
assert(chatHost.querySelector('[data-chat-message="remote-1"]')?.textContent.includes('Hello client'), 'Chat must append incoming WebSocket messages')
chat.dispose()
chatHost.remove()

document.body.dataset.matrixExampleTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
