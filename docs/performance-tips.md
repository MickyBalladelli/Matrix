# Performance tips

Matrix updates the binding that read a changed signal. Performance usually comes from keeping dependency boundaries small and disposing work when it is no longer visible.

## Prefer local reactive reads

Read a signal in the text, attribute, or style binding that needs it:

```js
html`
  <h1>${title}</h1>
  <button ?disabled=${saving}>Save</button>
`
```

Avoid rebuilding a whole view in an Effect just to change one label. Use a `Computed` for a derived value and interpolate that value where it belongs.

Use `peek()` only when a read must not create a dependency. A `peek()` in a binding means that binding will not update when the source changes.

## Batch related writes

`batch` delays notification until the callback finishes. Use it for one user action that changes several signals:

```js
batch(() => {
  firstName.value = nextFirstName
  lastName.value = nextLastName
  status.value = 'saved'
})
```

Do not use `batch` to hide a long-running asynchronous operation. Keep the callback synchronous and batch only the state writes that belong together.

## Keep lists stable

Use `keyed(items, getKey)` for lists that reorder or update individual items. Keys must be unique and stable across renders.

```js
const rows = computed(() => keyed(
  records.value.map(record => component(Row, { record })),
  row => row.props.record.id
))
```

Good keys are database IDs or another stable identity. Array indexes are poor keys when insertion and removal can happen.

## Keep static work static

Create static CSS definitions and templates outside frequently called render functions when they do not depend on local state. Use `cssVariables` for a changing theme value instead of regenerating a stylesheet.

```js
const cardStyle = css`.card { color: var(--card-color); }`
const cardVars = cssVariables({ '--card-color': accent })
```

Styles are injected once per document. Call `disposeStyle` for a temporary stylesheet that will never be used again.

## Dispose temporary work

Unmount temporary views. Component scopes dispose their Effects, Computeds, event listeners, resources, and cleanup callbacks. Resources created outside a component need an explicit `dispose()`.

Avoid creating an Effect on every event or Computed evaluation. Create reactive state during component setup, then update it from events.

## Measure before changing a budget

Run the local checks from the repository root:

```bash
npm run bench
npm run test:performance
npm run size
```

`test:performance` checks the reactive benchmark and the DOM benchmark in Chromium, Firefox, and WebKit. `MATRIX_BROWSER=firefox npm run test:performance` is useful when investigating one engine. Record the Node/browser version, operating system, and hardware with release measurements.

## Common anti-patterns

| Anti-pattern | Cost | Better pattern |
| --- | --- | --- |
| Read every signal in one top-level binding | Unrelated updates rerun together | Split the view into local bindings or components |
| Recreate a large unkeyed array on every change | DOM identity is lost | Use `keyed` with stable keys |
| Generate CSS on every render | Rehashing and style work repeat | Reuse `css` and update `cssVariables` |
| Keep an unused mounted view | Effects and listeners stay alive | Call `unmount()` |
| Mutate an object in place and expect a signal update | `Object.is` still sees the same object | Replace the object or use `update` with a new reference |
