# Benchmarks

Benchmarks are local measurements, not unit tests. Keep the machine, Node version, browser version, and iteration counts with any result that is used for a release decision.

## Commands

```bash
npm run bench
npm run bench:memory
npm run test:performance
npm run bench:compare
```

`npm run test:performance` checks the Node reactivity budget and both browser benchmark pages in Chromium, Firefox, and WebKit. Use `--browser` or `MATRIX_BROWSER` to isolate one browser, and `--fixture bench/extended.browser.html` to run only the extended page.

`bench/memory.js` runs with `--expose-gc` and reports the idle heap, allocation, and retained heap for 1,000 Signals and 1,000 Effects. Browser memory fields are included when the browser exposes `performance.memory`.

`bench/compare.mjs` always measures Matrix and optionally bundles React, Vue, and Preact when those packages are installed. The comparison protocol is deliberately small: mount one button, perform 100 synchronous state updates, and unmount it. Results are directional and should only be compared on the same machine and browser.

## Profiles

| Use case | Benchmark | Main signal |
| --- | --- | --- |
| Reactive state | `bench/reactivity.js` | update throughput and subscriber cost |
| Memory | `bench/memory.js` and extended browser page | allocation and retained heap |
| Large lists | `keyed list mount/update/unmount 10000` | DOM work and list reconciliation |
| Theme updates | `css variables update 100` | style binding cost |
| Many subscribers | `rapid signal updates 100 subscribers` | repeated notification cost |
| Small interactive UI | `bench/compare.mjs` | directional mount/update/unmount comparison |

Do not change a budget from one noisy run. Repeat the measurement, inspect the operation profile, and record the before/after result in the release notes.
