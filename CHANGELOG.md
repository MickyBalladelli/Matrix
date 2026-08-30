# Changelog

## 0.1.0-alpha.1 — 2026-08-29

- Warn when multiple Matrix runtimes are loaded in the same global scope.
- Run `createForm` validators once on creation so initial errors are present.
- Tighten package smoke coverage for packed TypeScript/JSX consumers.
- Narrow `npm test` to `test/*.test.js` and harden the browser test runner.
- Add a local pre-release audit for package contents, exports, production logs, Node deprecations, changelog structure, and performance history.
- Add stable release preparation and verification commands for package metadata, release notes, npm tags, and the app generator.
- Rebaseline Brotli budgets at 17,000 bytes for the full runtime and 9,000 bytes for utilities after the release API additions.

## 0.1.0-alpha.0 — 2026-08-29

- Published the first npm package as `@mickyballadelli/matrix`.
- Kept Matrix ESM-only, with public exports limited to the documented entry points.
- Documented Prism as a peer-dependency consumer so applications keep one Matrix runtime.
- Size (minified / gzip / Brotli): root 31350 / 11195 / 10039 bytes.

## 0.0.1 — Alpha

- Added Matrix's reactive engine: signals, effects, computed states and scopes.
- Added HTML Template Literal rendering without a Virtual DOM.
- Added functional components and lifecycle hooks.
- Added scoped CSS and reactive CSS variables.
- Added the router, form bindings, async resources and debug tools.
- Added the TODO App example, written tests and benchmarks.
