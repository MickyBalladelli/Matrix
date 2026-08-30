import {
  component,
  computed,
  createForm,
  css,
  effect,
  html,
  keyed,
  mount,
  signal
} from '../../src/index.js'

const DEFAULT_NOTES = [
  { id: 'welcome', title: 'Welcome to Matrix', body: 'Signals keep this note list and editor in sync.', tags: ['matrix', 'guide'] },
  { id: 'ideas', title: 'Ideas', body: 'Try searching by title, body, or tag.', tags: ['planning'] }
]

const appStyle = css`
  .notes-app { max-width: 72rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .notes-layout { display: grid; grid-template-columns: minmax(14rem, 22rem) 1fr; gap: 1rem; }
  .notes-panel, .editor { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .75rem; background: white; }
  .notes-list { display: grid; gap: .5rem; padding: 0; list-style: none; }
  .note-row { display: grid; grid-template-columns: 1fr auto; gap: .5rem; align-items: center; padding: .6rem; border-radius: .45rem; }
  .note-row.selected { background: #eff6ff; }
  .note-select { display: grid; gap: .2rem; border: 0; padding: 0; text-align: left; background: transparent; cursor: pointer; }
  .note-select strong { color: #172033; }
  .note-tags { color: #64748b; font-size: .85rem; }
  .notes-toolbar { display: flex; gap: .75rem; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  input, textarea { box-sizing: border-box; width: 100%; padding: .6rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  textarea { min-height: 14rem; resize: vertical; }
  label { display: grid; gap: .3rem; margin: .8rem 0; }
  button { border: 0; border-radius: .45rem; padding: .55rem .8rem; color: white; background: #2563eb; cursor: pointer; }
  button.secondary { color: #172033; background: #e2e8f0; }
  button.danger { background: #b91c1c; }
  .editor-actions { display: flex; gap: .6rem; }
  .error { color: #b91c1c; }
  @media (max-width: 700px) { .notes-layout { grid-template-columns: 1fr; } }
`

const emptyNote = () => ({ title: '', body: '', tags: '' })

function readNotes(storage, storageKey) {
  try {
    const stored = JSON.parse(storage?.getItem(storageKey) ?? 'null')
    return Array.isArray(stored) ? stored : DEFAULT_NOTES.map(note => ({ ...note, tags: [...note.tags] }))
  } catch {
    return DEFAULT_NOTES.map(note => ({ ...note, tags: [...note.tags] }))
  }
}

function NoteRow({ note, selected, onSelect, onDelete }) {
  return html`
    <li class=${selected ? 'note-row selected' : 'note-row'}>
      <button class="note-select" data-note-select=${note.id} @click=${() => onSelect(note.id)}>
        <strong>${note.title || 'Untitled note'}</strong>
        <span class="note-tags">${note.tags.join(', ')}</span>
      </button>
      <button class="danger" data-note-delete=${note.id} @click=${() => onDelete(note.id)}>Delete</button>
    </li>
  `
}

export function mountNotesApp(container, options = {}) {
  const storage = options.storage ?? globalThis.localStorage
  const storageKey = options.storageKey ?? 'matrix-notes'
  const notes = signal(readNotes(storage, storageKey))
  const search = signal('')
  const selectedId = signal(null)
  const editor = createForm(emptyNote(), {
    title: value => value.trim() ? undefined : 'Title is required',
    body: value => value.trim() ? undefined : 'Body is required'
  }, { name: 'notes-editor' })
  const status = signal('')
  let nextId = 1

  const filteredNotes = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) {
      return notes.value
    }

    return notes.value.filter(note => [note.title, note.body, ...note.tags]
      .some(value => value.toLowerCase().includes(query)))
  })
  const editorErrors = computed(() => Object.values(editor.errors.value)
    .map(message => html`<li class="error">${message}</li>`))
  const noteCount = computed(() => `${filteredNotes.value.length} note(s)`)
  const editorHeading = computed(() => selectedId.value ? 'Edit note' : 'New note')
  const noteRows = computed(() => filteredNotes.value.map(note => component(NoteRow, {
    note,
    selected: selectedId.value === note.id,
    onSelect: selectNote,
    onDelete: deleteNote
  })))

  function selectNote(id) {
    const note = notes.value.find(candidate => candidate.id === id)
    if (!note) {
      return
    }

    selectedId.value = id
    editor.reset({ title: note.title, body: note.body, tags: note.tags.join(', ') })
    status.value = ''
  }

  function createNote() {
    selectedId.value = null
    editor.reset(emptyNote())
    status.value = ''
  }

  function saveNote() {
    if (Object.keys(editor.validate()).length > 0) {
      return false
    }

    const values = editor.values.value
    const nextNote = {
      id: selectedId.value ?? `note-${Date.now()}-${nextId++}`,
      title: values.title.trim(),
      body: values.body.trim(),
      tags: values.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    if (selectedId.value) {
      notes.update(items => items.map(note => note.id === selectedId.value ? nextNote : note))
    } else {
      notes.update(items => [nextNote, ...items])
      selectedId.value = nextNote.id
    }
    status.value = 'Saved locally'
    return true
  }

  function deleteNote(id) {
    notes.update(items => items.filter(note => note.id !== id))
    if (selectedId.value === id) {
      createNote()
    }
    status.value = 'Deleted'
  }

  const stopStorage = effect(() => {
    try {
      storage?.setItem(storageKey, JSON.stringify(notes.value))
    } catch {
      status.value = 'Local storage is unavailable'
    }
  })

  function Editor() {
    return html`
      <section class="editor">
        <h2>${editorHeading}</h2>
        <form data-note-editor @submit=${event => {
          event.preventDefault()
          saveNote()
        }}>
          <label>Title <input data-note-title use:bind=${editor.fields.title}></label>
          <label>Body <textarea data-note-body use:bind=${editor.fields.body}></textarea></label>
          <label>Tags <input data-note-tags use:bind=${editor.fields.tags} placeholder="work, ideas"></label>
          <ul>${editorErrors}</ul>
          <div class="editor-actions">
            <button data-note-save type="submit">Save note</button>
            <button class="secondary" data-note-new type="button" @click=${createNote}>New note</button>
          </div>
          <p data-note-status aria-live="polite">${status}</p>
        </form>
      </section>
    `
  }

  const app = mount(() => html`
    <main use:style=${appStyle} class="notes-app">
      <div class="notes-toolbar">
        <h1>Matrix Notes</h1>
        <input data-note-search aria-label="Search notes" placeholder="Search notes" use:bind=${search}>
      </div>
      <div class="notes-layout">
        <aside class="notes-panel">
          <p data-note-count>${noteCount}</p>
          <ul class="notes-list">${keyed(noteRows, item => item.props.note.id)}</ul>
        </aside>
        ${component(Editor)}
      </div>
    </main>
  `, container)

  return {
    app,
    notes,
    search,
    selectedId,
    editor,
    ready: Promise.resolve(),
    saveNote,
    selectNote,
    deleteNote,
    dispose() {
      app.unmount()
      stopStorage()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountNotesApp(document.querySelector('#app'))
}
