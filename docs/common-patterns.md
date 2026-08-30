# Common patterns

Matrix views are ordinary functions that return `html`, a component, an array, or a reactive value. Keep state in signals and let the smallest binding that needs a value read it.

## Conditional rendering

Use a `Computed` when the condition must change after the view is mounted. `null`, `undefined`, `false`, and `true` render no nodes.

```js
import { computed, html, signal } from '@mickyballadelli/matrix'

const open = signal(false)
const details = computed(() => open.value
  ? html`<p class="details">Extra details are visible.</p>`
  : null
)

const view = html`
  <button @click=${() => open.update(value => !value)}>
    ${computed(() => open.value ? 'Hide details' : 'Show details')}
  </button>
  ${details}
`
```

For a boolean attribute, use the `?` directive. The signal itself stays reactive:

```js
html`<button ?disabled=${open}>Continue</button>`
```

## Lists

An array interpolation renders each item. Use `keyed` when items can be inserted, removed, or reordered and their identity should be preserved.

```js
import { component, html, keyed, signal } from '@mickyballadelli/matrix'

const todos = signal([
  { id: 1, title: 'Read the guide', done: false },
  { id: 2, title: 'Ship the feature', done: true }
])

const TodoRow = ({ todo }) => html`
  <li>${todo.title}</li>
`

const rows = keyed(
  todos.value.map(todo => component(TodoRow, { todo })),
  item => item.props.todo.id
)

const view = html`<ul>${rows}</ul>`
```

For a list that changes, create the keyed value in a `Computed` so it reads the list signal:

```js
const rows = computed(() => keyed(
  todos.value.map(todo => component(TodoRow, { todo })),
  item => item.props.todo.id
))
```

Keys must be unique within one list. Keeping a key and component function keeps the component instance and its local state.

## Forms

For one field, bind a writable signal:

```js
const email = signal('')
const view = html`
  <label>
    Email
    <input type="email" use:bind=${email}>
  </label>
`
```

Use `createForm` when a form has several fields, validators, errors, or a reset action. See [Form validation](./forms.md).

## Async loading

`resource` owns loading, data, error, cancellation, and disposal. The loader receives the configured arguments followed by an optional `AbortSignal`.

```js
import { computed, html, resource } from '@mickyballadelli/matrix'

const user = resource(async (id, requestSignal) => {
  const response = await fetch(`/api/users/${id}`, { signal: requestSignal })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}, {
  args: ['42'],
  immediate: true
})

const userView = computed(() => {
  if (user.loading.value) return html`<p aria-live="polite">Loading…</p>`
  if (user.error.value) return html`<p role="alert">Could not load the user.</p>`
  if (!user.data.value) return html`<p>No user found.</p>`
  return html`<p>${user.data.value.name}</p>`
})

const view = html`<section>${userView}</section>`
```

Create a resource inside a component when it belongs to that component. Matrix then disposes it with the component scope. A resource created at module scope must be disposed manually.

## Sharing state

Export a signal from a module when several views own the same state. For tree-local dependencies, use `provide` and `inject` instead of a hidden global.

```js
import { component, html, inject, provide, signal } from '@mickyballadelli/matrix'

const theme = signal('light')

const ThemeProvider = () => {
  provide('theme', theme)
  return component(Panel)
}

const Panel = () => {
  const currentTheme = inject('theme')
  return html`<section data-theme=${currentTheme}>Panel</section>`
}
```

Keep component props read-only. If a component needs local state, copy the initial value into a local signal or ask the parent to update its signal.
