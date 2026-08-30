# CSS scoping

`css()` creates a scoped `StyleDefinition`. Apply it with `use:style` and Matrix marks the receiving element with a `data-matrix-scope` attribute. The stylesheet is injected once per document.

## Basic scope

```js
const cardStyle = css`
  .card {
    padding: 1rem;
  }

  .title {
    color: var(--card-title);
  }
`

const view = html`
  <article use:style=${cardStyle} class="card">
    <h2 class="title">Scoped card</h2>
  </article>
`
```

The scope applies to the element carrying `use:style` and its descendants. Two components can reuse the same class names without their `css()` definitions sharing a selector scope.

## Complex selectors

Use normal selectors, including child and sibling combinators, selector lists, and pseudo-classes:

```js
const panelStyle = css`
  :host {
    display: grid;
    gap: 1rem;
  }

  .row > .label,
  .row > .value {
    min-width: 0;
  }

  .row:focus-within {
    outline: 2px solid royalblue;
  }

  @media (max-width: 40rem) {
    :host {
      display: block;
    }
  }
`
```

`:host` refers to the element carrying the scope. `@media` and keyframe blocks are preserved while ordinary selectors inside supported at-rules are scoped.

Use `:global(selector)` for an intentionally global selector:

```js
const pageStyle = css`
  :global(body) {
    margin: 0;
  }
`
```

Keep the global escape rare. A global rule can affect every application component.

## Reactive variables

Use `cssVariables` when the value changes often. Matrix updates the affected CSS property without rebuilding the stylesheet:

```js
const accent = signal('rebeccapurple')
const style = css`.button { color: var(--accent); }`
const variables = cssVariables({ '--accent': accent })

const view = html`
  <button use:style=${style} use:vars=${variables} class="button">
    Change me
  </button>
`
```

`tokens(overrides)` is a convenience wrapper for the default Matrix variables. `theme()` creates global root variables and can include a dark-mode definition.

## Scope lifetime

The style element remains cached in the document after a view unmounts so later uses do not reinject it. `use:style` removes the scope marker during cleanup. Remove a temporary stylesheet completely with:

```js
disposeStyle(styleDefinition)
```

Call `disposeStyle` only when no mounted view still uses the definition.

## Limitations

- CSS is scoped by selector rewriting, not Shadow DOM. Global browser rules, inherited properties, and stacking contexts still apply.
- `globalCss()` is never scoped.
- Keep keyframe names unique because animation names are document-global.
- CSS source is not sanitized. Keep selectors and rules authored by the application; validate user values before placing them in CSS variables.
- Apply `use:style` to an element. A component that returns only text, a fragment, or a list has no single root to mark.
