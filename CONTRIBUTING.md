# Contributing

1. Keep changes small and preserve the public ESM API.
2. Add Node, browser, package, or declaration coverage for changed behavior.
3. Update `CHANGELOG.md` and migration notes for public changes.
4. Run `npm run verify:release` before opening a pull request. It covers unit, type, browser, performance, package and size checks.
5. Do not include generated application assets in the npm package.

Public APIs are the entry points declared in `package.json`. Other files are internal.
