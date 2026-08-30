import {
  component,
  computed,
  css,
  html,
  keyed,
  mount,
  signal
} from '../../src/index.js'

const INITIAL_MESSAGES = [
  { id: 'welcome', author: 'Matrix bot', text: 'Welcome to the local Matrix chat.' }
]

const appStyle = css`
  .chat { display: grid; grid-template-rows: auto 1fr auto; width: min(44rem, calc(100% - 2rem)); min-height: 34rem; margin: 2rem auto; border: 1px solid #dbe3ef; border-radius: .75rem; overflow: hidden; font-family: system-ui, sans-serif; color: #172033; background: white; }
  .chat-header, .chat-compose { display: flex; gap: .75rem; align-items: center; padding: 1rem; background: #f8fafc; }
  .chat-header { justify-content: space-between; border-bottom: 1px solid #dbe3ef; }
  .chat-status { display: inline-flex; gap: .35rem; align-items: center; color: #64748b; font-size: .9rem; }
  .chat-status::before { width: .55rem; height: .55rem; border-radius: 50%; background: currentColor; content: ''; }
  .chat-log { display: grid; align-content: start; gap: .7rem; padding: 1rem; overflow: auto; list-style: none; }
  .message { max-width: 80%; padding: .65rem .8rem; border-radius: .7rem; background: #eff6ff; }
  .message.self { justify-self: end; background: #d1fae5; }
  .message-author { display: block; margin-bottom: .2rem; font-size: .8rem; color: #475569; }
  .chat-compose input { flex: 1; min-width: 0; padding: .65rem; border: 1px solid #aebbd0; border-radius: .45rem; font: inherit; }
  .chat-compose button { padding: .65rem .9rem; border: 0; border-radius: .45rem; color: white; background: #2563eb; cursor: pointer; }
`

export function createDemoChatSocket(options = {}) {
  const delay = options.delay ?? 30
  const listeners = new Map()
  let closed = false
  let messageId = 1

  const emit = (type, event = {}) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(event)
    }
  }

  const socket = {
    readyState: 0,
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) ?? new Set()
      typeListeners.add(listener)
      listeners.set(type, typeListeners)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    send(rawMessage) {
      if (closed || socket.readyState !== 1) {
        throw new Error('Chat socket is not open')
      }

      const message = JSON.parse(rawMessage)
      setTimeout(() => {
        if (closed) {
          return
        }
        emit('message', {
          data: JSON.stringify({
            type: 'message',
            id: `echo-${messageId++}`,
            author: 'You',
            text: message.text
          })
        })
      }, delay)
    },
    close() {
      if (closed) {
        return
      }
      closed = true
      socket.readyState = 3
      emit('close')
    }
  }

  setTimeout(() => {
    if (closed) {
      return
    }
    socket.readyState = 1
    emit('open')
  }, 0)

  return socket
}

export function createWebSocketChatSocket(url) {
  if (typeof WebSocket !== 'function') {
    throw new Error('WebSocket is not available in this browser')
  }
  return new WebSocket(url)
}

function ChatMessage({ message }) {
  return html`
    <li class=${message.author === 'You' ? 'message self' : 'message'} data-chat-message=${message.id}>
      <span class="message-author">${message.author}</span>
      <span>${message.text}</span>
    </li>
  `
}

export function mountChatApp(container, options = {}) {
  const socket = options.socket
    ?? options.socketFactory?.()
    ?? (options.url ? createWebSocketChatSocket(options.url) : createDemoChatSocket())
  const messages = signal(options.initialMessages ?? INITIAL_MESSAGES.map(message => ({ ...message })))
  const draft = signal('')
  const connection = signal(socket.readyState === 1 ? 'connected' : 'connecting')
  const messageViews = computed(() => messages.value.map(message => component(ChatMessage, { message })))
  let messageSequence = messages.value.length + 1
  let resolveReady
  const ready = new Promise(resolve => {
    resolveReady = resolve
  })

  const onOpen = () => {
    connection.value = 'connected'
    resolveReady()
  }
  const onClose = () => {
    connection.value = 'offline'
  }
  const onError = () => {
    connection.value = 'error'
  }
  const onMessage = event => {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      if (!message || message.type !== 'message' || typeof message.text !== 'string') {
        return
      }
      messages.update(items => [...items, {
        id: message.id ?? `message-${messageSequence++}`,
        author: message.author ?? 'Remote user',
        text: message.text
      }])
    } catch {
      connection.value = 'error'
    }
  }

  socket.addEventListener('open', onOpen)
  socket.addEventListener('close', onClose)
  socket.addEventListener('error', onError)
  socket.addEventListener('message', onMessage)
  if (socket.readyState === 1) {
    resolveReady()
  }

  function sendMessage() {
    const text = draft.value.trim()
    if (!text || socket.readyState !== 1) {
      return false
    }

    socket.send(JSON.stringify({ type: 'message', text }))
    draft.value = ''
    return true
  }

  const app = mount(() => html`
    <main use:style=${appStyle} class="chat">
      <header class="chat-header">
        <h1>Matrix Chat</h1>
        <span class="chat-status" data-chat-status>${connection}</span>
      </header>
      <ul class="chat-log" data-chat-log>${keyed(messageViews, item => item.props.message.id)}</ul>
      <form class="chat-compose" data-chat-form @submit.prevent=${sendMessage}>
        <input data-chat-input aria-label="Message" placeholder="Write a message" use:bind=${draft}>
        <button data-chat-send type="submit">Send</button>
      </form>
    </main>
  `, container)

  return {
    app,
    socket,
    messages,
    draft,
    connection,
    ready,
    sendMessage,
    dispose() {
      app.unmount()
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.close()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountChatApp(document.querySelector('#app'))
}
