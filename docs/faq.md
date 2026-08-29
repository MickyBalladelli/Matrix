# FAQ

## Why no Virtual DOM?

Each interpolation has its own Effect. A change updates its targeted text, attribute or subtree.

## Do I need React-style hooks?

No. A component is a function. Create its local signals while it runs.

## Can I inject user HTML?

Not by default. Interpolated values become escaped text. Use a dedicated primitive only after explicit sanitization.

## When should I use `batch`?

When an action writes several signals and the interface should update only once.

## How do I share state?

Export a signal from a module. The `provide`/`inject` context is available but should remain explicit.

## Is CSS really scoped?

`css` prefixes selectors with `data-matrix-scope`. `globalCss` is global and should remain exceptional.
