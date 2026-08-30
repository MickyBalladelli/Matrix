# Matrix Architecture

## Data flow

```text
signal -> computed/effect -> DOM binding -> targeted node
                                      -> component
                                      -> style or form
```

The reactive engine does not know about the DOM. The renderer knows about signals, but the Matrix engine knows neither templates nor components.

## Modules

- `src/reactivity`: dependency graph, scheduler, scopes and cleanup.
- `src/dom`: tagged templates, template cache, bindings and mounting.
- `src/jsx-runtime.js`: optional JSX adapter built on the DOM renderer and component runtime.
- `src/components`: props, functional components and lifecycle.
- `src/styles`: scoped CSS, global CSS and reactive variables.
- `src/utils`: router, forms, async resources and debugging.
- `src/plugins.js`: four small extension points for tools and integrations.
- `src/utils/debug.js`: runtime snapshots, component/source/effect/router inspectors, and performance timelines for DevTools.

The exports declared in `package.json` are public. The npm artifact uses `dist`; files below other paths are internal and may change between alpha versions.

## Reactivity

Reading `source.value` inside an `effect` or `computed` registers the consumer in `source.subscribers`. A write compares the old and new values with `Object.is` by default.

Dependencies are removed before every new calculation. A conditional read can therefore change the graph without retaining an old subscription.

Effects are synchronous by default. `flush: 'microtask'` and `batch()` group updates. Each component owns a child scope. Unmounting it disposes all its Effects, Computeds, listeners and cleanup functions.

## Rendering

`html` keeps static content in an `HTMLTemplateElement` cached by template identity and document. Expressions become text or attribute markers. Each marker receives its own binding and Effect.

Dynamic data is escaped when it becomes text. A DOM node, template, component, list or signal is rendered without rebuilding its parent.

The optional JSX runtime translates JSX elements into cached Matrix templates and JSX components into Matrix component results. JSX runtime keys integrate with `keyed()`. JSX is app tooling; the core renderer does not require it.

Dangerous dynamic URL values are rejected before writing. Self-closing tags and markup corrections follow the browser's native HTML parser.

## Components

A component is a `props => view` function. The runtime gives it a scope and runs `onMount` after inserting its view. `onUnmount` and scope cleanup run during unmount. Props are protected by a read-only Proxy. `provide` and `inject` traverse the parent-child chain without adding a DOM dependency.

An `errorBoundary` catches errors from a descendant and renders its fallback view in the same location.

Child `onMount` hooks run before the parent's because the child is inserted during the parent render. Cleanup runs in the opposite direction: child cleanup runs before parent cleanup.

## Styling

`css` computes a stable identifier for a definition and prefixes selectors with a `data-matrix-scope` attribute. Styles are injected once per document. `cssVariables` updates only the CSS properties driven by a signal.

Plugins can observe the renderer, scheduler, log events and style manager. They are optional and are not required on the normal rendering path.

## Alpha limits

- Intentional raw HTML is not provided by default.
- Keyed reconciliation is explicit through `keyed()`; unkeyed arrays do not perform advanced diffing.
- SSR and hydration are outside this first release.
- The router uses the History API and requires a browser environment.
