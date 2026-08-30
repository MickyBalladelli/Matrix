# Testing strategies

Test Matrix applications at the layer where a behavior is observable. Keep pure state tests fast, use real browsers for DOM behavior, and use declaration fixtures for TypeScript behavior.

## Local commands

From the Matrix repository root:

```bash
npm test
npm run test:types
npm run test:browser
npm run test:performance
npm run test:package
npm run size
```

`npm run verify:release` runs the full local gate in that order. Browser tests use Chromium, Firefox, and WebKit; install them once with `npx playwright install chromium firefox webkit`.

Run one browser while investigating a failure:

```bash
npm run test:browser -- --browser firefox
MATRIX_BROWSER=webkit npm run test:performance
```

## Unit tests for reactivity

Use Node's built-in test runner for signals, Computeds, Effects, batching, scopes, and cleanup. Assert observable values and cleanup, not private source fields.

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { effect, signal } from '../src/index.js'

test('effect follows a signal and stops cleanly', () => {
  const count = signal(0)
  const values = []
  const stop = effect(() => values.push(count.value))

  count.value = 1
  stop()
  count.value = 2

  assert.deepEqual(values, [0, 1])
})
```

Cover equality, dynamic dependencies, sync and microtask flushing, nested scopes, errors, and repeated disposal. A test that creates an Effect must stop it or own it with a disposed scope.

## Browser tests for the DOM

Browser fixtures should run against a real document. The local runner serves the repository over HTTP, opens the DOM, integration, example, edge-case, and compatibility fixtures, and waits for `window.__MATRIX_TEST_RESULT__ === 'passed'`.

Add an assertion to `test/dom.browser.js` when testing rendering, event modifiers, form controls, styles, components, router behavior, or browser-only APIs. Keep the fixture deterministic and write a clear assertion message:

```js
assert(button.textContent === 'Saved', 'button shows the saved state')
```

If a test needs asynchronous work, await it in the browser fixture and set the result marker only after the final assertion. Test both the first mount and a mount after unmounting when cleanup matters.

Example applications expose injectable API, storage, and WebSocket adapters. Keep example tests in `test/examples.browser.js` and use deterministic adapters there so local tests do not depend on a service or network.

Use `test/edge-cases.browser.js` for ordering-sensitive cleanup behavior: write assertions for the final DOM, final signal values, lifecycle counts, and active effect count after the operation settles.

## Type tests

Put positive and negative JSX cases in `test/types/*.tsx`. Use `@ts-expect-error` for an error that must remain rejected:

```tsx
import type { Signal } from '@mickyballadelli/matrix'

declare const count: Signal<number>

// @ts-expect-error Signal values are read-only
count.value = 1

const view = <button onClick={() => count.set(count.peek() + 1)} />
```

`npm run test:types` runs the root strict TypeScript project against public declarations and JSX fixtures. An unused `@ts-expect-error` is a useful regression signal: it means a previously rejected API became accepted.

## Performance checks

Keep benchmark inputs stable. Measure reactive updates and DOM operations separately, then compare against the budgets in `bench/performance-budgets.js`. Record environment details before changing a budget.

Performance tests should catch a meaningful regression, not enforce one laptop's exact timing. Use broad budgets, repeat suspicious measurements, and inspect the operation count when time alone is noisy.

## Package smoke tests

`npm run test:package` builds the package, checks every public export, packs it, installs the tarball in a temporary fixture, imports each entry point, and runs a strict TypeScript consumer check. This catches missing files and export-map mistakes that source tests cannot see.

## Test design checklist

- Give each test one behavior and one useful failure message.
- Assert cleanup, not just initial output.
- Test user-visible DOM and browser behavior in a real browser.
- Keep network calls behind an application loader boundary; use deterministic fixtures for the framework suite.
- Test error boundaries with both render-time and lifecycle failures.
- Test keyed lists with insertion, removal, reorder, duplicate keys, and state preservation.
- Test form validation with valid, invalid, reset, and async-submit paths.
- Test router guards, redirects, query/hash values, and deep-link server fallback.
