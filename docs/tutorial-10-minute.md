# Matrix in 10 minutes

This tutorial builds a small todo list with signals, a computed count, a form binding, and a component. It uses the published package and a local Vite dev server.

## 1. Create the app

```bash
mkdir matrix-todos
cd matrix-todos
npm init -y
npm install @mickyballadelli/matrix
npm install --save-dev vite
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
mkdir src
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Matrix todos</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## 2. Add state

Create `src/main.js`:

```js
import { computed, html, mount, signal } from '@mickyballadelli/matrix'

const draft = signal('')
const todos = signal([
  { id: 1, text: 'Install Matrix', done: true },
  { id: 2, text: 'Build a tiny app', done: false }
])

const remaining = computed(() =>
  todos.value.filter(todo => !todo.done).length
)
```

Reading `todos.value` inside `remaining` makes the Computed update when the list changes. A signal is writable through `.set()` or `.update()`.

## 3. Create a view

Append the component and mount it:

```js
const App = () => html`
  <section class="app">
    <h1>Todos</h1>
    <p>${remaining} item${computed(() => remaining.value === 1 ? '' : 's')} left</p>

    <form @submit.prevent=${event => {
      event.preventDefault()
      const text = draft.value.trim()
      if (!text) return

      todos.update(items => [
        ...items,
        { id: Date.now(), text, done: false }
      ])
      draft.value = ''
    }}>
      <label>
        New todo
        <input use:bind=${draft} autocomplete="off">
      </label>
      <button>Add</button>
    </form>

    <ul>
      ${computed(() => todos.value.map(todo => html`
        <li class=${todo.done ? 'done' : ''}>
          <label>
            <input
              type="checkbox"
              .checked=${todo.done}
              @change=${event => {
                const checked = event.currentTarget.checked
                todos.update(items => items.map(item =>
                  item.id === todo.id ? { ...item, done: checked } : item
                ))
              }}
            >
            ${todo.text}
          </label>
        </li>
      `))}
    </ul>
  </section>
`

mount(App, document.querySelector('#app'))
```

`html` expressions can be text, attributes, properties, events, templates, components, arrays, or reactive values. The renderer updates only the binding that depends on a changed value.

## 4. Add styles

Create `src/style.css` and import it at the top of `src/main.js`:

```js
import './style.css'
```

```css
body {
  margin: 2rem;
  font: 16px system-ui, sans-serif;
}

.app {
  max-width: 32rem;
  margin: auto;
}

.done {
  color: #64748b;
  text-decoration: line-through;
}
```

## 5. Run it

```bash
npm run dev
```

Open the URL Vite prints. Change the input, add an item, and toggle a checkbox. Stop the mount when embedding Matrix into a temporary page:

```js
const app = mount(App, document.querySelector('#app'))
app.unmount()
```

For a generated starter with the same automatic JSX setup, use `npx create-matrix-app my-app` instead.
