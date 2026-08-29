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
- Size of the source ESM graph, then gzip and Brotli; minified size waits for the bundler choice.
- Memory after 1,000 mounts and unmounts.

## Alpha thresholds

- Simple template mount: less than 5 ms on a recent development machine.
- Single binding update: less than 1 ms excluding browser paint cost.
- Mounting a keyed list of 1,000 items: less than 50 ms.
- No listener or scope residue after 1,000 unmounts.

Reproducible benchmarks live in `bench/reactivity.js` and `bench/dom.browser.js`. The second measures mounting, one update, a keyed list and a full replacement reference. DOM measurements must use a real DOM, not only the reactive engine.

After `npm run build`, `npm run size` measures the aggregated source ESM graph, gzip and Brotli. The output explicitly says when minification is not available yet.

`npm run bench` measures the reactive engine. Keep results in a release note with the machine, browser or Node version used. External comparisons remain optional until the protocol is identical.
