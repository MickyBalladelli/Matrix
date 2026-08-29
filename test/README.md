# Tests

- `reactivity.test.js` contains Node unit tests for Matrix's reactive engine.
- `dom.browser.html` loads `dom.browser.js` in a browser and checks rendering, components, styles, forms and keyed lists.

The browser test must be served with the repository files so relative ESM imports work.

The HTML file loads the test as an ESM module. The script writes `window.__MATRIX_TEST_RESULT__ = 'passed'` and `body[data-matrix-tests="passed"]` when all assertions finish.
