# Performance

## Rules

- Read a signal in the binding closest to the node that must update.
- Use `batch()` when an action writes several signals.
- Keep large stylesheets static.
- Use `cssVariables` for frequent theme changes.
- Give future list renders stable keys.
- Unmount temporary views to release their scopes.

## Measurements to keep

- Initial mount time.
- Time for a targeted update.
- Number of DOM operations.
- Minified, gzip, and Brotli size for every public runtime entry.
- Memory after 1,000 mounts and unmounts.

## Alpha thresholds

- Simple template mount: less than 5 ms on a recent development machine.
- Single binding update: less than 1 ms excluding browser paint cost.
- Mounting a keyed list of 1,000 items: less than 50 ms.
- No listener or scope residue after 1,000 unmounts.

Reproducible benchmarks live in `bench/reactivity.js` and `bench/dom.browser.js`. The second measures mounting, one update, a keyed list and a full replacement reference. DOM measurements must use a real DOM, not only the reactive engine.

`npm run test:performance` checks both benchmarks against the budgets in `bench/performance-budgets.js`. It runs the DOM benchmark in Chromium, Firefox and WebKit and fails on a budget regression. Set `MATRIX_BROWSER` or pass `--browser` to the browser benchmark runner when investigating one engine.

`npm run size` bundles each public entry with esbuild, records minified, gzip, and Brotli bytes, and fails when a checked-in Brotli budget is exceeded.

`npm run bench` measures the reactive engine. Keep results in a release note with the machine, browser or Node version used. External comparisons remain optional until the protocol is identical.

Release notes must record `npm run size`, `npm run bench`, Node version, browser version, operating system, and hardware. Compare a release with the previous published version before changing a budget.
