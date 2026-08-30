# Development mode

Turn on Matrix's extra runtime checks near application startup:

```js
import { configure } from '@mickyballadelli/matrix'

configure({ development: true })
```

Development mode keeps the normal runtime behavior but adds warnings for mistakes that are easy to miss:

- prop writes and deletes include a user callsite;
- signal and Computed reads outside an Effect or template suggest `.peek()`;
- likely `{value}` template typos suggest `${value}`;
- routes with duplicate paths, unreachable catch-alls, invalid views, redirects, or missing views are reported;
- form validators that throw, return the wrong type, or target unknown fields are reported;
- templates with too many dynamic bindings suggest splitting the view.

Use `getRuntimeConfig()` to inspect the active settings. `bindingWarningThreshold` controls the large-template warning and defaults to `50`.

```js
import { configure, createForm, getRuntimeConfig, signal } from '@mickyballadelli/matrix'

configure({ development: true, bindingWarningThreshold: 25 })
console.log(getRuntimeConfig())

const count = signal(0, { name: 'count' })
count.peek() // intentional non-reactive read
```

Warnings also reach the `logger` plugin point. Diagnostic event types include `reactivity:untracked-read`, `component:prop-mutation`, `template:forgotten-interpolation`, `router:misconfiguration`, `form:validation-error`, and `performance:unoptimized-bindings`.

## Form inspection

Give a form a name and inspect its current validation state without creating reactive subscriptions:

```js
const form = createForm(initialValues, validators, { name: 'signup' })

form.validateField('email')
console.table(form.inspectField('email'))
console.log(form.inspect())
```

`inspect()` returns a snapshot of values, errors, validity, and each field. `inspectField(name)` returns one field or `undefined` for an unknown field.
