import { computed, html, mount, signal } from '../../../src/index.js'

export function createHistorySignal(initialValue, options = {}) {
  const limit = Math.max(1, Number(options.limit) || 50)
  const current = signal(initialValue, { name: options.name ?? 'history-value' })
  const revision = signal(0)
  const past = []
  const future = []

  function changed() {
    revision.update(value => value + 1)
  }

  function set(value) {
    if (Object.is(current.peek(), value)) return value
    past.push(current.peek())
    if (past.length > limit) past.shift()
    future.length = 0
    current.value = value
    changed()
    return value
  }

  function update(updater) {
    if (typeof updater !== 'function') throw new TypeError('history.update() expects a function')
    return set(updater(current.peek()))
  }

  function undo() {
    if (past.length === 0) return false
    future.push(current.peek())
    current.value = past.pop()
    changed()
    return true
  }

  function redo() {
    if (future.length === 0) return false
    past.push(current.peek())
    current.value = future.pop()
    changed()
    return true
  }

  const canUndo = computed(() => {
    revision.value
    return past.length > 0
  })
  const canRedo = computed(() => {
    revision.value
    return future.length > 0
  })

  return {
    value: current,
    canUndo,
    canRedo,
    set,
    update,
    undo,
    redo,
    dispose() {
      canUndo.dispose()
      canRedo.dispose()
      revision.dispose()
      current.dispose()
      past.length = 0
      future.length = 0
    }
  }
}

export function mountUndoRedoApp(container, options = {}) {
  const history = createHistorySignal(options.initialValue ?? '', { limit: options.limit ?? 20, name: 'editor-history' })
  const draft = signal(history.value.peek())
  const stopHistorySync = history.value.subscribe(value => {
    if (draft.peek() !== value) draft.value = value
  })
  const status = computed(() => `${history.canUndo.value ? 'Undo available' : 'At oldest edit'} · ${history.canRedo.value ? 'Redo available' : 'No redo'}`)

  function commitInput(event) {
    const value = event.currentTarget.value
    if (draft.peek() !== value) draft.value = value
    history.set(value)
  }

  const app = mount(() => html`
    <main class="integration-example">
      <p class="eyebrow">Integration pattern</p>
      <h1>Undo and redo with signals</h1>
      <p>A writable signal stays the source of truth while a bounded history stack handles navigation between edits.</p>
      <label>Document <textarea data-history-input use:bind=${draft} @input=${commitInput}></textarea></label>
      <div class="actions">
        <button data-history-undo ?disabled=${computed(() => !history.canUndo.value)} @click=${history.undo}>Undo</button>
        <button data-history-redo ?disabled=${computed(() => !history.canRedo.value)} @click=${history.redo}>Redo</button>
      </div>
      <p data-history-status class="status" aria-live="polite">${status}</p>
    </main>
  `, container)

  return {
    app,
    history,
    status,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      status.dispose()
      stopHistorySync()
      draft.dispose()
      history.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountUndoRedoApp(document.querySelector('#app'))
}
