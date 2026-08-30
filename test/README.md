# Tests

- `reactivity.test.js` contains Node unit tests for Matrix's reactive engine.
- `dom.browser.html` loads `dom.browser.js` in a browser and checks rendering, components, styles, forms and keyed lists.
- `npm run test:types` checks all public declarations and strict JSX fixtures, including read-only props, reactive props, intrinsic attributes and event names.

`npm run test:browser` serves the repository and runs the suite in Chromium, Firefox, and WebKit. The HTML file can still be opened directly for a manual pass.

Pass `--browser chromium`, `--browser firefox` or `--browser webkit` to run one engine.

`npm run test:performance` checks the reactive benchmark and DOM benchmark budgets in all three browsers.

The browser test must be served with the repository files so relative ESM imports work.

The HTML file loads the test as an ESM module. The script writes `window.__MATRIX_TEST_RESULT__ = 'passed'` and `body[data-matrix-tests="passed"]` when all assertions finish.
