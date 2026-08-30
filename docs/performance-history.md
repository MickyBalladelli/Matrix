# Performance history

Keep one note for every released version. Store raw measurements in
`bench/performance-history.json` and use this file for the reasoning behind
the numbers.

## Version `<version>` — `<date>`

- Environment: Node version, browser versions, operating system, hardware.
- Scope: profiles measured and whether optional framework comparisons were installed.
- Commands: exact commands used, including any browser or iteration flags.
- Baseline: size, mount, update, list, style, subscriber, and memory results.
- Changes: performance-related code or benchmark changes since the previous version.
- Result: improvements, regressions, noise, and comparison with the previous version.
- Decision: budgets kept, adjusted with evidence, or optimization reverted.

Before a release, run `npm run size` and `npm run bench:record -- --phase baseline
--label <version>`. The size check allows a fixed 2% tolerance over each
checked-in Brotli budget. Do not raise a budget only to hide a noisy result;
repeat the measurement and explain the decision here.

For an optimization between releases, follow
`bench/optimization-log.md` and record paired `before` and `after` runs.
