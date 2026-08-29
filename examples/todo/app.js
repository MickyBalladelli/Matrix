import {
  batch,
  component,
  computed,
  css,
  cssVariables,
  effect,
  html,
  keyed,
  mount,
  signal
} from '../../src/index.js'

const todos = signal([
  { id: 1, title: 'Comprendre les signals', done: true },
  { id: 2, title: 'Construire une TODO App', done: false }
])
const draft = signal('')
const filter = signal('all')
const themeColor = signal('#2563eb')
const storageKey = 'matrix-todos'

try {
  const storedTodos = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
  if (Array.isArray(storedTodos)) {
    todos.value = storedTodos
  }
} catch {
  // Une mémoire locale absente ou invalide ne bloque pas l’application.
}

const appStyle = css`
  .todo-app {
    max-width: 42rem;
    margin: 3rem auto;
    padding: 2rem;
    border-radius: 1rem;
    font-family: system-ui, sans-serif;
    box-shadow: 0 1rem 3rem rgb(15 23 42 / 12%);
  }

  .todo-list {
    display: grid;
    gap: .75rem;
    padding: 0;
    list-style: none;
  }

  .todo-row {
    display: flex;
    align-items: center;
    gap: .75rem;
  }

  .todo-row.done span {
    color: #64748b;
    text-decoration: line-through;
  }

  button {
    border: 0;
    border-radius: .5rem;
    padding: .6rem .8rem;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }
`

const appVariables = cssVariables({ '--accent': themeColor })

const visibleTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter(todo => !todo.done).map(todo => component(TodoRow, { todo }))
  }
  if (filter.value === 'done') {
    return todos.value.filter(todo => todo.done).map(todo => component(TodoRow, { todo }))
  }
  return todos.value.map(todo => component(TodoRow, { todo }))
})

const remaining = computed(() => todos.value.filter(todo => !todo.done).length)

const TodoRow = ({ todo }) => html`
  ${(() => {
    const editing = signal(false)
    const editDraft = signal(todo.title)
    const currentTodo = computed(() => todos.value.find(item => item.id === todo.id) ?? todo)
    const title = computed(() => currentTodo.value.title)
    const done = computed(() => currentTodo.value.done)
    const rowClass = computed(() => done.value ? 'todo-row done' : 'todo-row')
    const actionLabel = computed(() => editing.value ? 'Sauver' : 'Modifier')
    const editor = computed(() => editing.value
      ? html`
          <input use:bind=${editDraft} @keydown=${event => {
            if (event.key === 'Escape') {
              editing.value = false
            }
            if (event.key === 'Enter') {
              save()
            }
          }}>
        `
      : html`<span>${title}</span>`
    )

    function save() {
      const nextTitle = editDraft.value.trim()
      if (nextTitle) {
        todos.update(items => items.map(item => item.id === todo.id
          ? { ...item, title: nextTitle }
          : item
        ))
      }
      editing.value = false
    }

    return html`
      <li class=${rowClass}>
        <input
          type="checkbox"
          ?checked=${done}
          @change=${event => {
            todos.update(items => items.map(item => item.id === todo.id
              ? { ...item, done: event.currentTarget.checked }
              : item
            ))
          }}
        >
        ${editor}
        <button @click=${() => {
          if (editing.value) {
            save()
          } else {
            editDraft.value = title.value
            editing.value = true
          }
        }}>
          ${actionLabel}
        </button>
        <button @click=${() => todos.update(items => items.filter(item => item.id !== todo.id))}>
          Supprimer
        </button>
      </li>
    `
  })()}
`

const TodoInput = ({ value, onAdd }) => html`
  <form @submit=${event => {
    event.preventDefault()
    onAdd(value.value.trim())
  }}>
    <input use:bind=${value} placeholder="Nouvelle tâche">
    <button>Ajouter</button>
  </form>
`

const TodoList = ({ items }) => html`
  <ul class="todo-list">${items}</ul>
`

const App = () => html`
  ${(() => {
    effect(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(todos.value))
      } catch {
        // Certaines protections du navigateur peuvent bloquer localStorage.
      }
    })

    return null
  })()}
  <main use:style=${appStyle} use:vars=${appVariables} class="todo-app">
    <h1>Matrix TODO</h1>
    ${component(TodoInput, {
      value: draft,
      onAdd(title) {
        if (!title) {
          return
        }
        batch(() => {
          todos.update(items => [...items, { id: Date.now(), title, done: false }])
          draft.value = ''
        })
      }
    })}
    <p>${remaining} tâche(s) restante(s)</p>
    <nav>
      <button @click=${() => filter.value = 'all'}>Toutes</button>
      <button @click=${() => filter.value = 'active'}>Actives</button>
      <button @click=${() => filter.value = 'done'}>Terminées</button>
    </nav>
    ${component(TodoList, {
      items: keyed(visibleTodos, item => item.props.todo.id)
    })}
  </main>
`

mount(App, document.querySelector('#app'))
