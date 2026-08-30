# Extension patterns

These small pages show how to extend Matrix at application boundaries. Each
pattern is a dependency-free browser example and can be opened through a local
static server:

```text
examples/extensions/custom-form-input/index.html
examples/extensions/state-persistence/index.html
examples/extensions/analytics/index.html
examples/extensions/error-reporting/index.html
examples/extensions/a11y-audit/index.html
examples/extensions/performance-monitoring/index.html
```

The local browser fixture is `test/extension-patterns.browser.html`. It injects
deterministic adapters, checks the visible behavior, and verifies that plugin
cleanup unregisters its hooks.

## Patterns

- **Custom form input**: a reusable component owns labels, validation state,
  and `use:bind` wiring.
- **State persistence**: a signal persistence plugin hydrates once and writes
  serialized state through an injectable storage adapter.
- **Analytics**: a privacy-first plugin exposes explicit `track()` calls and
  records safe Matrix lifecycle events.
- **Error reporting**: a plugin sends component errors and browser failures to
  an injectable reporter without sending live reactive objects.
- **A11y audit**: a renderer plugin audits native controls after updates and
  reports missing names or labels.
- **Performance monitoring**: a scheduler/renderer plugin collects cheap
  counters and flush duration samples for a local panel.

Use `usePlugin()` for observation and diagnostics. Keep network calls, storage,
and reporting behind adapters so the application can disable them in
production or replace them in tests.
