# Matrix TODO

Review date: 2026-08-29

## What blocks npm and Vercel now

- [x] Use `@mickyballadelli/matrix` as the final npm name. `matrix` is already owned by an unrelated package (`matrix@1.0.3`). The scoped name was unused at review time.
- [ ] Rename the root package and every public import to `@mickyballadelli/matrix`. This includes Matrix examples, docs, `jsxImportSource`, the app template, Prism source, Prism types, and Prism showcase config.
- [ ] Remove `"private": true` from Matrix only when the package is ready to publish.
- [ ] Replace Prism's `peerDependencies.matrix: "file:../Matrix"` with a real semver peer dependency on the published package.
- [ ] Give Prism a local development dependency or workspace override for Matrix. Keep Matrix as a peer dependency in the published Prism package so an app gets one Matrix runtime, not two.
- [ ] Remove Vercel's dependence on sibling paths. Prism's showcase currently uses `file:../../../Matrix` plus Vite aliases to Matrix source files. A clean checkout or Vercel build must work using registry packages alone.
- [ ] Update both lockfiles after package names and dependency ranges change.
- [ ] Deploy Prism from a clean checkout before release. Confirm install, production build, routing, JSX production runtime, and JSX development runtime all resolve from npm.

## Make a clean Matrix npm package

- [ ] Pick one package layout. Right now npm would ship both `src` and a copied `dist/src`. Recommended: make one of them canonical and point every export to it.
- [ ] Clean the build output before producing a package. The current dry run includes stale `dist/app` example assets.
- [ ] Stop shipping unrelated built examples. Current dry run contains 76 files and 187,475 unpacked bytes, including duplicate source and stale app output.
- [ ] Add a `prepack` script so the npm artifact is always generated from current source.
- [ ] Add `types`, `import`, and `default` conditions to every public export. Secondary paths such as `/reactivity`, `/components`, `/dom`, `/styles`, `/utils`, and `/plugins` currently have no explicit type target.
- [ ] Decide whether raw internal source is public. If not, export only supported entry points from the built package.
- [ ] Add package metadata: `description`, `license`, `author`, `repository`, `homepage`, `bugs`, `keywords`, `engines`, and `publishConfig.access: "public"`.
- [ ] Document that Matrix is ESM-only and state supported Node, bundler, and browser versions.
- [ ] Add a package smoke check that installs the packed tarball in an empty project and imports the root API, every subpath, and both JSX runtimes.
- [ ] Add a TypeScript smoke check against the packed package.
- [ ] Run `npm pack --dry-run` before every release and inspect every included file.

## First release steps

- [x] npm account exists.
- [ ] Enable npm 2FA if direct publishing asks for it.
- [ ] Publish the first experimental release under a prerelease version and non-`latest` tag, for example `0.1.0-alpha.0` with `--tag next`.
- [ ] Use `npm publish --access public` for a scoped public package.
- [ ] Update `PUBLISH.md`. It currently assumes the free unscoped name and uses `npm version`, which creates a git commit and tag by default. Use a version workflow that does not create them automatically.
- [ ] Verify the published package with `npm view`, install the exact published version in a clean fixture, then promote the tag only after Prism works on Vercel.
- [ ] Publish `create-matrix-app` after Matrix. The unscoped `create-matrix-app` name is unused at review time, but ownership must still be checked before release.
- [ ] Update the generator template dependency to the final Matrix name and version.
- [ ] Update `create-matrix-app/index.mjs`; its local-project detection and dependency rewrite are hard-coded to the name `matrix`.
- [ ] Pack and inspect `create-matrix-app`, then create one app outside this repository and confirm it installs only registry dependencies.

Publish commands after the package cleanup above is complete:

```bash
cd /Users/micky/dev/Matrix

npm login --cache /private/tmp/matrix-npm-cache
npm whoami --cache /private/tmp/matrix-npm-cache

npm pkg set name='@mickyballadelli/matrix'
npm pkg delete private
npm pkg set publishConfig.access=public
npm version 0.1.0-alpha.0 --no-git-tag-version

mv dist Trash/dist-before-npm-publish-2026-08-29
npm run build

npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache

npm view @mickyballadelli/matrix@0.1.0-alpha.0 --cache /private/tmp/matrix-npm-cache
```

Install this alpha with:

```bash
npm install @mickyballadelli/matrix@next
```

## Runtime correctness gaps

- [ ] Automate the browser test suite. It currently requires manually opening `test/dom.browser.html`; `npm test` covers only the Node reactivity suite.
- [ ] Add CI for supported Node versions and real browsers. Include Chromium, Firefox, and WebKit if all are claimed as supported.
- [ ] Add integration coverage based on real Prism components. Cover `Popup`, `Select`, `Table`, router navigation, theme injection, mount, and full unmount cleanup.
- [ ] Define and test JSX `key` behavior. The type signatures accept a runtime key argument, but `jsx`, `jsxs`, and `jsxDEV` currently ignore it.
- [ ] Test chained JSX event modifiers. The runtime only removes one suffix while parsing names such as capture, once, passive, prevent, and stop.
- [ ] Fix object-style updates so properties removed from the next object do not remain on the DOM element.
- [ ] Add regression checks for component rerenders. Confirm old effects, computed values, mount callbacks, and DOM bindings are disposed while state that should survive is preserved.
- [ ] Add error-boundary tests for failures after partial DOM insertion and failures inside lifecycle callbacks.
- [ ] Add leak checks for repeated mount/unmount, keyed list replacement, forms with debounce, router start/stop, styles, and aborted resources.
- [ ] Make `mount().unmount()` and other cleanup handles explicitly idempotent and test repeated calls.

## Types and developer experience

- [ ] Split declarations by public entry point or map each export to an accurate declaration file.
- [ ] Improve JSX types. `IntrinsicElements` currently accepts any element and any property, so TypeScript cannot catch misspelled attributes, events, or invalid component props.
- [ ] Make runtime and declaration signatures match exactly, including component results, router hooks, resource loader arguments, writable computed values, plugin events, style results, and cleanup handles.
- [ ] Add declaration tests for the patterns used by Prism, including reactive props and JSX children.
- [ ] Choose one language for public errors and docs. Documentation is English, but many runtime errors are French.
- [ ] Add development warnings for invalid hook order, changing signal/computed slot order, duplicate Matrix runtimes, and unhandled router links.
- [ ] Add source maps if a built `dist` becomes the published contract.

## API and platform gaps

- [ ] Decide the router's query-string and hash API. It currently strips both from its reactive path and from navigation targets.
- [ ] Add router handling for same-page anchors, scroll restoration, base paths on static hosts, redirects, and a documented Vercel rewrite rule.
- [ ] Decide whether navigation guards may be async. Current guards are synchronous only.
- [ ] Document the security policy for dynamic URLs, CSS values, DOM nodes, and intentional raw HTML. Add focused security regression cases.
- [ ] Verify scoped CSS against nested at-rules, keyframes, modern CSS nesting, complex selectors, and multiple documents.
- [ ] Complete accessibility checks for default tokens, focus states, form bindings, router links, and reduced-motion behavior.
- [ ] State the SSR/hydration position clearly. It need not block the first client-only npm release, but server imports and Vercel prerendering behavior must be predictable.
- [ ] Record minified, gzip, and Brotli size for each public entry instead of measuring only the aggregated unminified source graph.
- [ ] Save benchmark results by Matrix version and define a regression budget.

## Documentation and maintenance

- [ ] Replace clone-and-import setup in `README.md` with the final npm install command.
- [ ] Add a minimal Matrix + Vite + JSX guide using the final package name.
- [ ] Add a Prism integration guide showing Matrix as a peer dependency and explaining why only one runtime instance should exist.
- [ ] Document all supported exports and mark experimental APIs clearly before the first public release.
- [ ] Reconcile docs with code. The architecture says advanced keys need a dedicated primitive, while older project planning claimed component key support was complete.
- [ ] Add contribution, support, security-reporting, and release-process documents.
- [ ] Keep `CHANGELOG.md` and migration notes updated for every public API or package-name change.

## Suggested order

1. Rename Matrix and its consumers to `@mickyballadelli/matrix`.
2. Fix package contents and export/type maps.
3. Publish an alpha under `next`.
4. Convert Prism from local paths to the npm package.
5. Prove the Prism Vercel deployment from a clean checkout.
6. Automate browser, package, and type checks before promoting the release.
