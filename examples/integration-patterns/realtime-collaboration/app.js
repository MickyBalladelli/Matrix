import { computed, html, mount, signal } from '../../../src/index.js'

export function createLocalCollaborationTransport(options = {}) {
  const listeners = new Set()
  const delay = options.delay ?? 30
  const remoteClientId = options.remoteClientId ?? 'remote-peer'
  let closed = false

  return {
    async connect() {
      if (closed) throw new Error('Collaboration transport is closed')
      return { peerCount: 1 }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    send(message) {
      if (closed) throw new Error('Collaboration transport is closed')
      setTimeout(() => {
        if (closed) return
        const remoteMessage = { ...message, clientId: remoteClientId, author: 'Remote peer' }
        for (const listener of [...listeners]) listener(remoteMessage)
      }, delay)
    },
    close() {
      closed = true
      listeners.clear()
    }
  }
}

export function mountRealtimeCollaborationApp(container, options = {}) {
  const transport = options.transport ?? createLocalCollaborationTransport()
  const clientId = options.clientId ?? `local-${Date.now()}`
  const draft = signal(options.initialText ?? '')
  const remoteEdits = signal(0)
  const peerCount = signal(0)
  const status = signal('Connecting…')
  const message = computed(() => `${peerCount.value} peer(s) connected · ${remoteEdits.value} remote edit(s)`)

  function applyRemoteMessage(nextMessage) {
    if (!nextMessage || nextMessage.type !== 'edit' || nextMessage.clientId === clientId || typeof nextMessage.text !== 'string') return
    draft.value = nextMessage.text
    remoteEdits.update(value => value + 1)
    status.value = `Updated by ${nextMessage.author ?? 'remote peer'}`
  }

  function sendEdit(event) {
    const text = String(event.currentTarget.value)
    draft.value = text
    try {
      transport.send({ type: 'edit', text, clientId })
      status.value = 'Changes shared'
    } catch (error) {
      status.value = error.message
    }
  }

  const stopTransport = transport.subscribe(applyRemoteMessage)
  const app = mount(() => html`
    <main class="integration-example">
      <p class="eyebrow">Integration pattern</p>
      <h1>Real-time collaboration</h1>
      <p>Keep transport messages as data. Apply remote edits to signals and clean up the subscription with the app.</p>
      <label>Shared note <textarea data-collab-input use:bind=${draft} @input=${sendEdit}></textarea></label>
      <p data-collab-status class="status" aria-live="polite">${status}</p>
      <p data-collab-presence class="muted">${message}</p>
    </main>
  `, container)

  const ready = Promise.resolve()
    .then(() => transport.connect?.())
    .then(connection => {
      peerCount.value = connection?.peerCount ?? 1
      status.value = 'Connected'
      return connection
    })
    .catch(error => {
      status.value = error.message
      throw error
    })

  return {
    app,
    transport,
    draft,
    peerCount,
    remoteEdits,
    status,
    ready,
    sendEdit,
    dispose() {
      app.unmount()
      stopTransport()
      transport.close?.()
      message.dispose()
      draft.dispose()
      peerCount.dispose()
      remoteEdits.dispose()
      status.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountRealtimeCollaborationApp(document.querySelector('#app'))
}
