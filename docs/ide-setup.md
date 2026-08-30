# IDE setup

Matrix ships TypeScript declarations even though its runtime is JavaScript. The declarations provide JSX intrinsic-element checking, event completion, reactive value types, and read-only component props.

## JavaScript projects

Use `.jsx` for JSX and configure the automatic runtime in `jsconfig.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "checkJs": false,
    "jsx": "react-jsx",
    "jsxImportSource": "@mickyballadelli/matrix",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  },
  "include": ["src/**/*"]
}
```

Set `checkJs` to `true` when you want JavaScript files checked as well. Add JSDoc types to component props when inference needs help:

```jsx
import { html } from '@mickyballadelli/matrix'

/** @param {{ label: string, count: import('@mickyballadelli/matrix').Signal<number> }} props */
const Counter = ({ label, count }) => html`
  <button>${label}: ${count}</button>
`
```

## TypeScript projects

Use strict mode and the Matrix automatic JSX runtime:

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@mickyballadelli/matrix",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

Type component props as read-only. Signals are written with `.set()` or `.update()`; their public `.value` is read-only in TypeScript.

```tsx
import { html } from '@mickyballadelli/matrix'
import type { Signal } from '@mickyballadelli/matrix'

type CounterProps = {
  count: Signal<number>
  label: string
}

export function Counter(props: Readonly<CounterProps>) {
  return html`<span>${props.label}: ${props.count}</span>`
}
```

The editor should offer completion for intrinsic properties, `data-*`, `aria-*`, and events such as `onClick`, `onInput`, and their supported modifiers. A misspelled intrinsic property or event should be a type error.

## VS Code

1. Install the workspace dependencies so VS Code can use the local TypeScript version.
2. Open a `.jsx` or `.tsx` file and confirm the language mode is JavaScript React or TypeScript React.
3. Run **TypeScript: Select TypeScript Version** and choose **Use Workspace Version**.
4. Hover a Matrix import or JSX attribute to inspect the declaration being used.
5. Run `npm run test:types` from the Matrix repository when changing declarations.

If JSX completion is missing, check `jsxImportSource`, the file extension, and that the package's `types` export resolves. Do not add `@types/react` just to make Matrix JSX work; Matrix supplies its own JSX namespace.

## Editor checks worth keeping

- `strict: true`
- `forceConsistentCasingInFileNames: true`
- `noUncheckedIndexedAccess: true` for application code that reads remote or dynamic data
- `exactOptionalPropertyTypes: true` when optional configuration fields must distinguish omitted from `undefined`

Keep generated `dist` files out of the editor's source include when the package source is already imported through its normal export. This avoids duplicate definitions and duplicate-runtime confusion.
