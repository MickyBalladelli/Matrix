# Quick guide

## 1. State

```js
const name = signal('Grog')
name.value = 'Mog'
name.update(value => `${value}!`)
```

Read `.value` in a template or Effect. For a read without subscription, use `.peek()`.

Objects and arrays are compared by reference. Replace the value or use `update` with a new reference to trigger an update.

## 2. Computed and Effects

```js
const firstName = signal('Ada')
const lastName = signal('Lovelace')
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

const stop = effect(() => {
  document.title = fullName.value
})
```

Call `stop()` when the Effect should no longer live. Inside a component, the scope handles it automatically.

## 3. Components

```js
const Counter = props => {
  const label = props.label ?? 'Counter'
  const count = signal(0)

  onMount(element => {
    element?.focus?.()
  })

  return html`
    <button @click=${() => count.update(value => value + 1)}>
      ${label}: ${count}
    </button>
  `
}

const App = () => html`
  ${component(Counter, { label: 'Score' })}
`
```

Props flow down. Callbacks flow up. Local state stays inside the instance.

In a `keyed` list, a new value with the same key and the same component function updates props and keeps local signals. A new key creates a new instance. A new component function creates a new identity.

Shared state can be provided explicitly:

```js
const Theme = signal('light')

const Provider = () => {
  provide('theme', Theme)
  return component(Panel)
}

const Panel = () => {
  const theme = inject('theme')
  return html`<section data-theme=${theme}>Panel</section>`
}
```

## 4. Forms

```js
const email = signal('')
const view = html`<input type="email" use:bind=${email}>`
```

The binding supports text, number, checkbox, single select and multiple select fields.

## 5. Router

```js
const router = createRouter([
  { path: '/', view: Home },
  { path: '/users/:id', view: User }
])

router.start()
await router.navigate('/users/7?tab=profile#details')
```

`router.current` is a Computed state containing the route and its parameters, or `null`. `router.search` and `router.hash` preserve the rest of the URL.

To render the active view in a template:

```js
const activeView = routerView(router, NotFound)
const App = () => html`${activeView}`
```

A sync or async guard can be provided with `beforeEach`. Return `false` to block navigation.

## 6. Styles

```js
const buttonStyle = css`
  button { color: var(--accent) }
`
const accent = signal('rebeccapurple')

const view = html`
  <section use:style=${buttonStyle} use:vars=${cssVariables({ '--accent': accent })}>
    <button>Action</button>
  </section>
`
```

Selectors are limited to the marked subtree. Use `globalCss` for an intentionally global rule.

To remove a temporary stylesheet, call `disposeStyle(style)`. To connect tools, use `usePlugin` with the `renderer`, `scheduler`, `logger` or `style` points.
