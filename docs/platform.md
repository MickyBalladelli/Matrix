# Platform support

Matrix is ESM-only.

- Supported runtime: Node 18 and newer.
- Browser checks: current Chromium, Firefox, and WebKit.
- Bundlers: Vite with automatic JSX runtime, or any ESM bundler for tagged templates.
- Direct browser use: `dist/matrix.js` from a trusted host.

## Browser compatibility

Matrix ships ESM and does not transpile its runtime. The supported minimums are:

| Browser | Minimum |
| --- | --- |
| Chrome | 90+ |
| Edge | 90+ |
| Firefox | 88+ |
| Safari | 15+ |
| iOS Safari | 15+ |
| Chrome for Android | 90+ |

The `browserslist` field in `package.json` is the machine-readable copy of this
matrix. The compatibility fixture checks ESM loading, Signals, Computeds,
Effects, DOM events, touch events, dark-mode media queries, and RTL rendering.

Run the local checks with Playwright:

```bash
npm run test:browser:compat
npm run test:browser:dark
npm run test:browser:ios
npm run test:browser:android
npm run test:browser:edge
```

Install the matching Playwright browsers once with
`npx playwright install chromium firefox webkit`. The iOS and Android commands
use Playwright device emulation. The Edge command uses an installed Edge
channel. Use `--browser`, `--device`, `--channel`, and `--color-scheme` with
`test/run-browser-tests.mjs` for other local combinations.

Touch handlers should use normal Matrix event bindings or `delegate`; keep
touch targets large enough for the product UI. Set `dir="rtl"` on the document
or a root element for RTL layouts. Use `matchMedia('(prefers-color-scheme:
dark)')` or `theme({ light, dark })` for dark mode and verify both color schemes
when the application has scheme-specific UI.

Package imports are safe in a server process. DOM rendering, styles, forms, and the router require browser DOM globals when called.

SSR output and hydration are not supported in this alpha. Vercel must build Matrix applications as client applications unless the application supplies its own server rendering boundary.
