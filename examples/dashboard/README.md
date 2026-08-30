# Dashboard example

This app demonstrates a component-heavy dashboard with asynchronous data, metric cards, a keyed activity list, a trend chart, filters, and a local performance timeline.

Run `examples/dashboard/index.html` through a local static server. Replace the `api` option with an adapter exposing `load(range, signal)` to connect a real metrics endpoint.

## Test

`test/examples.browser.js` injects dashboard data, checks metric rendering, filters activity, reloads a different range, and records a timeline.

## Performance notes

Metric cards, chart bars, and activity rows are separate components with keyed lists. The expensive data request runs through a Resource and reloads only when the selected range changes. Use server aggregation and windowed rows when activity grows beyond a few hundred entries.
