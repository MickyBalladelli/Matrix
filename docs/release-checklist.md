# Pre-release checklist

Matrix keeps release checks local. No hosted workflow is required.

Run the complete gate with:

```sh
npm run verify:release
```

This runs the unit, type, browser, performance, package, and size checks, then
`npm run check:release`. The final audit verifies:

- the `npm pack --dry-run` file list and every declared export target;
- the documented package entry points and root runtime exports;
- a minified production bundle smoke test with `console.warn` and
  `console.error` spies;
- Node with deprecations treated as errors;
- the current-version changelog entry and release-note structure;
- a recorded performance history entry with no recorded regressions.

Before the final audit, record a release baseline:

```sh
npm run bench:record -- --phase baseline --label <version>
```

Keep the previous version's run in `bench/performance-history.json`; the audit
requires the current run and one previous run for comparison.

For an optimization, record paired runs and check the comparison:

```sh
npm run bench:record -- --phase before --change <name>
npm run bench:record -- --phase after --change <name> --check
```

The audit does not publish, commit, or change GitHub settings. It may rebuild
`dist` as part of `npm pack --dry-run`.

For stable version preparation, tagging, publishing, installation verification,
and announcements, follow [PUBLISH.md](../PUBLISH.md).
