# Platform support

Matrix is ESM-only.

- Published package checks: Node 20 and Node 22.
- Browser checks: current Chromium, Firefox, and WebKit.
- Bundlers: Vite with automatic JSX runtime, or any ESM bundler for tagged templates.
- Direct browser use: `dist/matrix.js` from a trusted host.

Package imports are safe in a server process. DOM rendering, styles, forms, and the router require browser DOM globals when called.

SSR output and hydration are not supported in this alpha. Vercel must build Matrix applications as client applications unless the application supplies its own server rendering boundary.
