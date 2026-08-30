# Matrix DevTools

This unpacked extension works in Chrome, Edge, and Firefox.

1. Enable Matrix diagnostics in the app:

   ```js
   import { configure, createDevtools } from '@mickyballadelli/matrix'

   configure({ development: true })
   createDevtools({ redact: false })
   ```

2. Open the browser's extension page and load this `devtools/` directory as an unpacked extension.
3. Open the browser DevTools for the app and select the **Matrix** panel.

The panel reads the page-local `window.__MATRIX_DEVTOOLS__` bridge. It shows the component tree, reactive sources, Effect dependency IDs, active router state, and recorded plugin events. Keep `redact: true` when inspected values contain user data.
