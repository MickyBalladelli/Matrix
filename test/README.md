# Tests

- `reactivity.test.js` contains Node unit tests for Matrix's reactive engine.
- `dom.browser.html` loads `dom.browser.js` in a browser and checks rendering, components, styles, forms and keyed lists.
- `integration.browser.html` loads `integration.browser.js` and checks complete forms, guarded routing, redirects, themes, nested composition, mixed syntax, SVG namespaces, touch gestures, and keyboard flows.
- `examples.browser.html` loads `examples.browser.js` and checks the Shopping Cart, Notes, Dashboard, and Chat applications through their adapter boundaries.
- `edge-cases.browser.html` loads `edge-cases.browser.js` and checks cleanup-time updates, lifecycle navigation, async form unmounts, style timing, long text, and rapid mount cycles.
- `browser-compatibility.browser.html` loads `browser-compatibility.browser.js` and checks ESM/runtime features, touch events, dark-mode media queries, and RTL rendering.
- `npm run test:types` checks all public declarations and strict JSX fixtures, including read-only props, reactive props, intrinsic attributes and event names.

`npm run test:browser` serves the repository and runs all browser suites in Chromium, Firefox, and WebKit. Use `--fixture test/examples.browser.html` to run only the example fixture. The HTML files can still be opened directly for a manual pass.

Pass `--browser chromium`, `--browser firefox` or `--browser webkit` to run one engine. Compatibility runs also accept `--device`, `--channel`, and `--color-scheme` for iOS/Android emulation, Edge, and dark-mode checks.

Use the package scripts `test:browser:ios`, `test:browser:android`,
`test:browser:edge`, and `test:browser:dark` for the standard compatibility
profiles.

`npm run test:performance` checks the reactive benchmark and DOM benchmark budgets in all three browsers.

The browser test must be served with the repository files so relative ESM imports work.

The HTML file loads the test as an ESM module. The script writes `window.__MATRIX_TEST_RESULT__ = 'passed'` and `body[data-matrix-tests="passed"]` when all assertions finish.
