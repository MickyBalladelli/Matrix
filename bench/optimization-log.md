# Optimization log

Record one `before` and one `after` run for every optimization attempt. Use the
same machine, Node version, browser set, and benchmark iteration counts for
both runs.

```bash
npm run bench:record -- --phase before --change keyed-list-reconcile --label 0.1.0-alpha.1-before
# Make one focused optimization.
npm run bench:record -- --phase after --change keyed-list-reconcile --label 0.1.0-alpha.1-after
```

The `after` command compares its measurements with the matching `before` run
and stores the result in `bench/performance-history.json`. Add a short human
note to `docs/performance-history.md` for each release: what changed, why it
was safe, which profiles moved, and whether the optimization was kept.

Use `--check` on the `after` command to fail when a shared metric regresses by
more than 5%. Small changes still need repeated measurements before changing a
budget.
