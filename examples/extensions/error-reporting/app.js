import { component, computed, errorBoundary, html, mount, signal, usePlugin } from '../../../src/index.js'

function safeReport(report) {
  return {
    type: String(report.type ?? 'runtime'),
    name: report.name ? String(report.name) : undefined,
    message: String(report.message ?? 'Unknown error'),
    stack: report.stack ? String(report.stack).slice(0, 2000) : undefined
  }
}

export function createErrorReportingPlugin(options = {}) {
  const send = options.report ?? (report => globalThis.console?.error?.('[Matrix error report]', report))
  const reports = signal([], { name: 'error-reports' })

  function capture(error, context = {}) {
    const report = safeReport({
      ...context,
      message: error?.message ?? error,
      stack: error?.stack
    })
    reports.update(items => [...items.slice(-19), report])
    try {
      send(report)
    } catch {
      // Error reporting must not replace the original failure.
    }
    return report
  }

  return {
    reports,
    capture,
    install(api) {
      const stopLogger = api.on('logger', event => {
        if (event.type === 'component:error') {
          capture({ message: event.message }, { type: 'component', name: event.name })
        }
      })
      const onError = event => capture(event.error ?? event.message, { type: 'window' })
      const onRejection = event => capture(event.reason, { type: 'unhandled-rejection' })
      globalThis.addEventListener?.('error', onError)
      globalThis.addEventListener?.('unhandledrejection', onRejection)
      return () => {
        stopLogger()
        globalThis.removeEventListener?.('error', onError)
        globalThis.removeEventListener?.('unhandledrejection', onRejection)
      }
    },
    dispose() {
      reports.dispose()
    }
  }
}

export function mountErrorReportingApp(container, options = {}) {
  const reporter = options.reporter ?? createErrorReportingPlugin({ report: options.report })
  const stopReporter = usePlugin(reporter)
  const failed = signal(false)
  const reportRows = computed(() => reporter.reports.value.map(report => html`<li><code>${report.type}</code> ${report.message}</li>`))

  function UnstablePanel() {
    throw new Error('Demo component failed to render')
  }
  const unstableView = computed(() => failed.value
    ? component(UnstablePanel)
    : html`<button data-error-trigger @click=${() => failed.value = true}>Trigger component error</button>`)

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>Error reporting plugin</h1>
      <p>Component failures and browser errors become safe reports for an injectable transport.</p>
      ${errorBoundary(() => unstableView, error => html`<p data-error-fallback class="error">Recovered: ${error.message}</p>`)}
      <h2>Reports</h2>
      <ul data-error-reports class="event-list">${reportRows}</ul>
    </main>
  `, container)

  return {
    app,
    reporter,
    failed,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      stopReporter()
      reportRows.dispose()
      unstableView.dispose()
      failed.dispose()
      if (!options.reporter) reporter.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountErrorReportingApp(document.querySelector('#app'))
}
