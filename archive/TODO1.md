# TODO — Matrix, ultra-lightweight reactive JavaScript framework

## Project vision

- [x] Define the framework name: Matrix.
- [x] Target an API simpler than React: functions, props, signals and templates.
- [x] Use fine-grained reactivity through signals, without a Virtual DOM.
- [x] Update only the affected DOM nodes.
- [x] Start without a mandatory compiler.
- [x] Keep the runtime small, modular and usable with vanilla JavaScript.
- [x] Support modern browsers with ESM and browser-ready output.
- [x] Define initial goals: compressed size, mount time, update cost and memory use.
- [x] Record architecture decisions in `docs/architecture.md`.

## Target architecture

- [x] Split the project into independent modules: reactivity, templates, DOM, components, styles and utilities.
- [x] Never make the reactive engine depend on the DOM.
- [x] Make rendering depend on the reactive engine, but not the reverse.
- [x] Define a minimal internal representation for DOM bindings.
- [x] Define cleanup rules for every subscription and effect.
- [x] Plan a stable public API with replaceable internal modules.
- [x] Document what is intentionally outside the first release.

## Target minimal API

```js
const count = signal(0)
const doubled = computed(() => count.value * 2)

const stop = effect(() => {
  console.log(count.value)
})

const view = () => html`
  <button @click=${() => count.value++}>
    ${count} × 2 = ${doubled}
  </button>
`

mount(view, document.querySelector('#app'))
```

- [x] Decide whether signals are read with value, a function or both.
- [x] Decide whether templates use an html function or an equivalent API.
- [x] Decide how components are represented in templates.
- [x] Define public API errors and warnings.

# Phase 1 — Core Reactive Engine

Goal: build Matrix's browser-independent, predictable and fine-grained reactive engine.

## 1.1 Basic signal

- [x] Create the signal(initialValue) function.
- [x] Store the current value in a private cell.
- [x] Expose reactive reads and controlled writes.
- [x] Define get, set and update.
- [x] Do not notify subscribers when the value does not change.
- [x] Allow a custom equality function.
- [x] Use Object.is as the default comparison.
- [x] Document behavior with mutable objects and arrays.
- [x] Provide a clear error when a signal is used after disposal.
- [x] Add tests for primitive values, objects, NaN, 0 and -0.

## 1.2 Dependency tracking

- [x] Create a stack or global context for the active computation.
- [x] Record the signal read by the active Effect or Computed.
- [x] Avoid duplicates when the same signal is read multiple times.
- [x] Remove old dependencies before every new calculation.
- [x] Handle conditional dependencies correctly.
- [x] Restore the parent context after nested computation.
- [x] Prevent leaks when a calculation is interrupted by an exception.
- [x] Document reactive-read rules inside user functions.

## 1.3 Effects

- [x] Create effect(fn) and return a stop function.
- [x] Run the Effect once when it is created.
- [x] Run it again when a dependency changes.
- [x] Avoid multiple synchronous runs for one change chain.
- [x] Define scheduling: synchronous by default or configurable microtask.
- [x] Add a queue to group updates.
- [x] Ensure an Effect does not subscribe twice to the same signal.
- [x] Handle errors without breaking other Effects.
- [x] Support cleanup returned by the Effect function.
- [x] Prevent a stopped Effect from accidentally resubscribing.
- [x] Detect obvious Effect loops.

## 1.4 Derived / Computed states

- [x] Create computed(fn) with lazy evaluation.
- [x] Cache the calculated value until a dependency changes.
- [x] Invalidate the cache when a dependency changes.
- [x] Notify consumers only when the Computed value actually changes.
- [x] Support nested Computeds.
- [x] Avoid work for Computeds that are never read.
- [x] Define behavior when a Computed throws an exception.
- [x] Add a writable variant only if it stays simple and useful.
- [x] Test dynamic dependencies and signal -> computed -> effect chains.

## 1.5 Scopes and cleanup

- [x] Create a reactive scope that groups Effects and Computeds.
- [x] Create dispose(scope) or an equivalent API.
- [x] Associate every Effect with its current scope.
- [x] Destroy all scope subscriptions in one operation.
- [x] Use this mechanism for component lifecycle.
- [x] Verify that no references remain after disposal.

## 1.6 Engine robustness

- [x] Define a limit or detection for dependency cycles.
- [x] Define stable subscriber notification order.
- [x] Test writes during Effect execution.
- [x] Test Effects that create other Effects.
- [x] Test exceptions and partial cleanup.
- [x] Measure memory cost for a signal and a subscription.
- [x] Measure an update with 1, 10, 100 and 1,000 subscribers.
- [x] Document synchronization guarantees.

# Phase 2 — Templating & DOM Rendering

Goal: turn HTML Template Literals into real DOM with targeted updates.

## 2.1 html function

- [x] Create the tagged html(strings, ...values) function.
- [x] Separate static HTML from dynamic values.
- [x] Build a DOM template from the static part.
- [x] Cache templates by strings identity.
- [x] Define accepted values: text, number, node, array, signal, component or null.
- [x] Automatically escape dynamic text.
- [x] Forbid or clearly document raw HTML injection.
- [ ] Add an explicit unsafeHTML primitive only if necessary.
- [x] Define behavior for false, undefined, null and empty strings.

## 2.2 Parsing and binding discovery

- [x] Choose a robust dynamic marker strategy.
- [x] Handle dynamic text values.
- [x] Handle dynamic attributes.
- [x] Handle dynamic DOM properties.
- [x] Handle booleans such as disabled, checked and hidden.
- [x] Handle dynamic inline style values if that API remains.
- [x] Handle dynamic CSS classes.
- [x] Handle comments and whitespace without moving user nodes.
- [x] Define rules for self-closing tags and invalid HTML.
- [x] Provide readable errors for misplaced bindings.
- [x] Verify SVG and XML namespace cases.
- [x] Verify templates with multiple roots.

## 2.3 Fine-grained DOM updates

- [x] Create one binding per dynamic interpolation.
- [x] Mount each binding with a targeted Effect.
- [x] Update only the affected text.
- [x] Update only the affected attribute.
- [x] Replace a dynamic node without rebuilding its parent.
- [x] Handle node arrays with a stable strategy.
- [x] Handle list insertion, removal and movement.
- [x] Add optional list keys.
- [x] Define behavior for unkeyed lists.
- [x] Reuse DOM nodes where possible.
- [x] Clean up Effects associated with removed bindings.
- [x] Avoid unnecessary DOM reads and writes.
- [x] Group DOM writes in the Phase 1 scheduler.

## 2.4 Events

- [x] Define event syntax, for example @click=handler.
- [x] Support native events without a heavy wrapper.
- [x] Add once, capture and passive options if the API stays readable.
- [x] Replace a handler cleanly when its value becomes reactive.
- [x] Remove listeners during unmount.
- [x] Avoid repeatedly adding identical listeners.
- [x] Define preventDefault and stopPropagation behavior.
- [x] Add optional event delegation for large lists.
- [x] Test keyboard, mouse, forms, IME composition and touch events.

## 2.5 DOM mount, update and unmount

- [x] Create mount(view, container).
- [x] Allow a component or template as the root.
- [x] Return an unmount function or mount instance.
- [x] Validate the container.
- [x] Define whether existing content is replaced, preserved or forbidden.
- [x] Clean all Effects, listeners and scopes during unmount.
- [x] Support mounting into a DocumentFragment for tests and future SSR.
- [x] Test mounting the same view repeatedly.
- [x] Test replacing one view with another.
- [x] Preserve focus and selection during compatible updates.

## 2.6 Rendering performance and security

- [x] Measure initial parsing cost.
- [x] Measure one interpolation update.
- [x] Compare targeted updates with full reconstruction.
- [x] Avoid innerHTML for unsafe dynamic data.
- [x] Document unsafeHTML limits.
- [x] Check sensitive URLs, attributes and properties.
- [x] Check behavior with very long content.

# Phase 3 — Component Architecture & Lifecycle

Goal: provide simple, isolated and composable functional components.

## 3.1 Functional components

- [x] Define component(render, props) as the minimal component form.
- [x] Allow a component to return a template, node or node list.
- [x] Define the Component(props) naming convention.
- [x] Clearly separate props, local state and shared context.
- [x] Forbid silent prop mutation.
- [x] Define behavior for missing props and defaults.
- [x] Allow children without creating a complex API.
- [x] Document component composition.

## 3.2 Isolated state

- [x] Create a useState API or a direct signal convention.
- [x] Ensure every component instance has its own state.
- [x] Avoid accidentally shared state between two mounts.
- [x] Define the lifetime of local signals.
- [x] Attach local state to the component scope.
- [x] Test two instances of the same component with independent state.
- [x] Test unmounting and remounting an instance.

## 3.3 Props and data flow

- [x] Pass primitive and object props without unnecessary copying.
- [x] Accept reactive props without losing their signal source.
- [x] Define the callback convention from child to parent.
- [x] Define a simple convention for component events.
- [x] Document the recommended flow: parent to child through props, child to parent through callbacks.
- [x] Add shared context only after validating the need.
- [x] Define provide and inject if context is kept.
- [x] Clean context subscriptions during unmount.

## 3.4 Lifecycle

- [x] Add onMount, executed after DOM insertion.
- [x] Add onCleanup or onUnmount.
- [x] Define the exact parent and child hook order.
- [x] Allow onMount to return cleanup.
- [x] Handle hook errors without leaving active Effects.
- [x] Document which hooks are valid during rendering.
- [x] Test nested mounts.
- [x] Test unmount triggered by a parent.
- [x] Test a component removed from a dynamic list.

## 3.5 Component identity and rendering

- [x] Define how to recognize the same instance across renders.
- [x] Preserve state during a prop update.
- [x] Destroy state when the key changes.
- [x] Add a key API for component lists.
- [x] Avoid recreating unchanged components.
- [x] Document cases where a new function creates a new instance.

## 3.6 Errors and extensibility

- [x] Add a minimal error boundary or error propagation mechanism.
- [x] Include the component name in error messages.
- [x] Provide internal plugins without imposing a heavy plugin system.
- [x] Define extension points: renderer, scheduler, logger and style manager.
- [x] Test a component that throws during rendering.

# Phase 4 — Styling System

Goal: provide reactive, scoped styling with low cost and readable CSS output.

## 4.1 Style model

- [x] Choose the main approach: scope attributes and CSS Variables, without requiring Shadow DOM.
- [x] Use CSS Variables for reactive values.
- [x] Keep static CSS rules outside frequent updates.
- [x] Define a css or style API compatible with components.
- [x] Define whether styles live in a component or separate file.
- [x] Document scope and CSS priority limits.

## 4.2 Scoped CSS

- [x] Generate a stable, short scope identifier.
- [x] Add the identifier to the component root.
- [x] Prefix local selectors with the scope identifier.
- [x] Handle combined selectors, pseudo-classes and pseudo-elements.
- [x] Define :global or an equivalent syntax.
- [x] Define :host behavior if Shadow DOM is supported.
- [x] Avoid collisions between components.
- [x] Deduplicate identical stylesheets.
- [x] Inject styles once per document.
- [x] Plan a strategy for multiple documents or iframes.
- [x] Remove temporary styles when a component requests it.

## 4.3 Reactive CSS variables

- [x] Accept a static value or signal for each variable.
- [x] Update only the affected CSS property.
- [x] Convert numbers, units, colors and strings cleanly.
- [x] Allow variables at component and subtree level.
- [x] Define syntax for global theme variables.
- [x] Avoid recreating the entire style attribute on every change.
- [x] Add tests for null, empty and invalid values.

## 4.4 Lightweight tokens and primitives

- [x] Define a small optional token set: colors, spacing, radii and typography.
- [x] Allow local token overrides.
- [x] Support light and dark themes through prefers-color-scheme.
- [x] Add a few utility primitives without generating a large CSS library.
- [x] Define a stable naming convention.
- [ ] Verify color and interactive-state accessibility.

## 4.5 Global versus component styles

- [x] Distinguish global, theme and scoped styles.
- [x] Prevent local styles from leaking to other components.
- [x] Document necessary global exceptions for body, links and focus.
- [x] Define style injection order.
- [x] Test two components with identical class names.
- [x] Test changing the theme at runtime.

# Phase 5 — Utilities & DX

Goal: make a small application pleasant to build without adding weight to the runtime.

## 5.1 Basic router

- [x] Create a History API router.
- [x] Define static and parameterized route APIs.
- [x] Add navigation links without reloads.
- [x] Handle pushState, replaceState and the back button.
- [x] Expose the current route as a signal.
- [x] Support a 404 page.
- [x] Provide a simple before-navigation guard.
- [x] Clean router listeners.
- [x] Document deployment for deep URLs.
- [x] Keep the router optional and separate from the core.

## 5.2 Forms and two-way bindings

- [x] Create a simple bind:value binding or equivalent API.
- [x] Synchronize signal to input.
- [x] Synchronize input to signal.
- [x] Handle input, change, checked, selected and files.
- [x] Handle text, number, checkbox, radio and select fields.
- [x] Preserve cursor position during updates.
- [x] Add optional debounce.
- [x] Define minimal synchronous validation.
- [x] Expose form errors reactively.
- [x] Clean listeners during unmount.
- [x] Test forms with IME composition and keyboard navigation.

## 5.3 Async and loading

- [x] Define a simple pattern for loading, data and error.
- [x] Add a utility to cancel a request during unmount.
- [x] Provide a fallback rendering pattern for async data.
- [x] Keep an HTTP client out of the core.
- [x] Document fetch integration.

## 5.4 DevTools and logging

- [x] Add a logger disabled by default in production.
- [x] Allow inspection of active signals, Computeds and Effects.
- [x] Add optional names for signals and components.
- [x] Expose debug events without slowing the normal path.
- [x] Show the causes of DOM updates.
- [x] Detect very frequent Effects and update loops.
- [x] Plan an API compatible with a future browser extension.
- [x] Redact sensitive data from logs.

## 5.5 Public API and DX

- [x] Export only necessary primitives from the main entry point.
- [x] Provide secondary imports for the router, styles and utilities.
- [x] Add handwritten TypeScript types without requiring TypeScript for users.
- [x] Check public signatures in TypeScript declarations.
- [x] Add errors with suggested fixes.
- [x] Define naming and versioning conventions.
- [x] Configure a modern ESM build and lightweight browser output.
- [x] Mark side-effect-free modules for tree-shaking.
- [ ] Measure minified and compressed size for every entry.
- [ ] Prepare a project creation command only after the API stabilizes.

# Phase 6 — Documentation, Tests & Examples

Goal: prove correctness, performance and simplicity.

## 6.1 Reactive engine unit tests

- [x] Test signal creation, reading and writing.
- [x] Test value comparison.
- [x] Test a simple Effect.
- [x] Test stopping an Effect.
- [x] Test multiple Effects on one signal.
- [x] Test lazy and cached Computeds.
- [x] Test conditional dependencies.
- [x] Test nested Computeds.
- [x] Test scopes and cleanup.
- [x] Test exceptions.
- [x] Test nested writes and the scheduler.
- [x] Test cycle detection.

## 6.2 DOM and template tests

- [x] Test dynamic text.
- [x] Test dynamic attributes and properties.
- [x] Test boolean attributes.
- [x] Test reactive classes and styles.
- [x] Test events and cleanup.
- [x] Test keyed list rendering.
- [x] Test nested components.
- [x] Test mounting and unmounting.
- [x] Test SVG.
- [x] Test array values.
- [x] Test escaping of dynamic content.
- [x] Test template syntax errors.

## 6.3 Component and lifecycle tests

- [x] Verify state isolation between two instances.
- [x] Verify prop passing and updates.
- [x] Verify child-to-parent callbacks.
- [x] Verify onMount and onUnmount order.
- [x] Verify that no Effect survives unmount.
- [x] Verify state preservation with a stable key.
- [x] Verify state destruction with a new key.
- [x] Test errors with the component name in the trace.

## 6.4 Styling system tests

- [x] Test scoped selector isolation.
- [x] Test pseudo-classes and pseudo-elements.
- [x] Test explicit global rules.
- [x] Test reactive CSS variables.
- [x] Test themes and theme changes.
- [x] Verify that injected styles are not duplicated.
- [x] Verify rendering in multiple components that share class names.

## 6.5 Integration tests

- [x] Test a complete application with multiple components.
- [x] Test the router and back/forward navigation.
- [x] Test a signal-controlled form.
- [x] Test an async flow with loading and error.
- [x] Test behavior after repeated mounts and unmounts.
- [x] Test ESM use in a real browser.
- [ ] Test officially supported browsers.

## 6.6 Benchmarks

- [x] Create an initial mount benchmark.
- [x] Create a single-signal update benchmark.
- [x] Create a 100- and 1,000-item list benchmark.
- [x] Create a full replacement benchmark to measure fine-grained rendering gains.
- [x] Measure the number of DOM operations.
- [x] Measure CPU time and memory.
- [ ] Measure raw, minified, gzip and Brotli size.
- [ ] Compare with manual DOM code and representative frameworks.
- [ ] Keep results by version to detect regressions.
- [x] Define acceptable performance thresholds in docs/performance.md.

## 6.7 TODO App example

- [x] Add a minimal Counter application to discover the API in minutes.
- [x] Create a minimal TODO application with task creation.
- [x] Add task editing and deletion.
- [x] Add completed and active states.
- [x] Add all, active and completed filters.
- [x] Add the remaining-task counter with a Computed.
- [x] Add a signal for form text.
- [x] Use a separate input component.
- [x] Use a separate list component.
- [x] Use a separate component for each task.
- [x] Add scoped styling and a variable-based theme.
- [x] Add localStorage persistence with correct cleanup.
- [x] Verify that only changed tasks update.
- [x] Document the example step by step.

## 6.8 User documentation

- [x] Write an installation guide under five minutes.
- [x] Write a signals guide.
- [x] Write an Effects and Computeds guide.
- [x] Write a templates and bindings guide.
- [x] Write a components and lifecycle guide.
- [x] Write a scoped styling guide.
- [x] Write a forms guide.
- [x] Write a router guide.
- [x] Add a complete API reference.
- [x] Add an FAQ about differences from React.
- [x] Add a migration guide for future versions.
- [x] Add short executable browser examples.
- [x] Document common errors and fixes.

## 6.9 Publishing

- [x] Define a license.
- [x] Add README.md with installation, examples and size goals.
- [x] Add a Semantic Versioning policy.
- [x] Generate production bundles.
- [ ] Verify public exports and sourcemaps.
- [x] Verify that development files are not unnecessarily published.
- [x] Prepare the initial changelog.
- [ ] Publish an alpha version only after the previous phases are validated.
- [ ] Collect API feedback before adding new abstractions.

# Definition of Done — alpha

- [x] A signal can trigger a targeted DOM update.
- [x] A Computed can be consumed by a template or Effect.
- [x] An Effect and all its subscriptions can be stopped.
- [x] A functional component can receive props and own isolated state.
- [x] Mounting and unmounting clean all Effects and events.
- [x] Templates escape dynamic data by default.
- [x] Dynamic lists work with stable keys.
- [x] Local styles do not leak to other components.
- [x] CSS variables can be driven by signals.
- [x] The TODO App works without a Virtual DOM.
- [ ] Critical tests pass in a real browser and a DOM test environment.
- [x] Benchmarks are reproducible.
- [x] Documentation lets a beginner create a first app.
- [x] The public API is small enough to learn in one session.
