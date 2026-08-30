import { mountA11yAuditApp, createA11yAuditPlugin } from '../examples/extensions/a11y-audit/app.js'
import { createAnalyticsPlugin, mountAnalyticsApp } from '../examples/extensions/analytics/app.js'
import { mountCustomFormInputApp } from '../examples/extensions/custom-form-input/app.js'
import { createErrorReportingPlugin, mountErrorReportingApp } from '../examples/extensions/error-reporting/app.js'
import { createPerformanceMonitoringPlugin, mountPerformanceMonitoringApp } from '../examples/extensions/performance-monitoring/app.js'
import { createStatePersistencePlugin, mountStatePersistenceApp } from '../examples/extensions/state-persistence/app.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}
const createHost = name => {
  const host = document.createElement('div')
  host.dataset.extensionPattern = name
  document.body.append(host)
  return host
}

const formHost = createHost('custom-form-input')
const formApp = mountCustomFormInputApp(formHost)
await formApp.ready
formHost.querySelector('[data-custom-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
assert(formHost.querySelector('[data-custom-status]').textContent.includes('Fix'), 'Custom input must expose validation status')
setInputValue(formHost.querySelector('#display-name'), 'Ada')
setInputValue(formHost.querySelector('#email'), 'ada@example.com')
formHost.querySelector('[data-custom-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
assert(formHost.querySelector('[data-custom-status]').textContent.includes('Saved Ada'), 'Custom input must submit valid form data')
assert(formHost.querySelector('#email').getAttribute('aria-describedby') === 'email-error', 'Custom input must connect its error description')
formApp.dispose()
formHost.remove()

const storageValues = new Map([['counter', '7']])
const storage = {
  getItem(key) {
    return storageValues.get(key) ?? null
  },
  setItem(key, value) {
    storageValues.set(key, String(value))
  }
}
const persistenceHost = createHost('state-persistence')
const persistenceApp = mountStatePersistenceApp(persistenceHost, { storage, key: 'counter', initialValue: 0 })
await persistenceApp.ready
assert(persistenceApp.count.value === 7, 'Persistence plugin must hydrate a signal')
persistenceHost.querySelector('[data-persist-add]').click()
assert(storageValues.get('counter') === '8', 'Persistence plugin must save signal updates')
persistenceApp.dispose()
persistenceHost.remove()

const sentAnalytics = []
const analytics = createAnalyticsPlugin({ allowedKeys: ['button'], send: event => sentAnalytics.push(event) })
const analyticsHost = createHost('analytics')
const analyticsApp = mountAnalyticsApp(analyticsHost, { analytics })
await analyticsApp.ready
analyticsHost.querySelector('[data-analytics-click]').click()
assert(sentAnalytics.some(event => event.name === 'demo_button_click'), 'Analytics plugin must send explicit events')
const clickEvent = sentAnalytics.find(event => event.name === 'demo_button_click')
assert(clickEvent.metadata.secret === undefined, 'Analytics plugin must filter unapproved metadata')
assert(analytics.events.value.some(event => event.name === 'matrix_component_mount'), 'Analytics plugin must observe Matrix lifecycle events')
analyticsApp.dispose()
analytics.dispose()
analyticsHost.remove()

const reportedErrors = []
const reporter = createErrorReportingPlugin({ report: report => reportedErrors.push(report) })
const errorHost = createHost('error-reporting')
const errorApp = mountErrorReportingApp(errorHost, { reporter })
await errorApp.ready
errorHost.querySelector('[data-error-trigger]').click()
assert(errorHost.querySelector('[data-error-fallback]').textContent.includes('Recovered'), 'Error boundary must recover after reporting')
assert(reportedErrors.some(report => report.type === 'component' && report.message.includes('failed to render')), 'Error plugin must report component failures')
errorApp.dispose()
reporter.dispose()
errorHost.remove()

const audits = []
const a11yHost = createHost('a11y-audit')
const auditor = createA11yAuditPlugin({ root: a11yHost, report: violations => audits.push(violations) })
const a11yApp = mountA11yAuditApp(a11yHost, { auditor })
await a11yApp.ready
assert(auditor.violations.value.length === 0, 'A11y plugin must pass the accessible initial view')
a11yHost.querySelector('[data-a11y-toggle]').click()
await wait(0)
assert(auditor.violations.value.some(violation => violation.rule === 'control-name'), 'A11y plugin must report unnamed controls')
assert(audits.some(violations => violations.length > 0), 'A11y plugin must publish audit results')
a11yApp.dispose()
auditor.dispose()
a11yHost.remove()

const performanceHost = createHost('performance-monitoring')
const performanceApp = mountPerformanceMonitoringApp(performanceHost, { now: () => performance.now() })
const monitor = performanceApp.monitor
await performanceApp.ready
const initialRendererUpdates = monitor.snapshot().rendererUpdates
performanceHost.querySelector('[data-performance-update]').click()
assert(performanceApp.count.value === 1, 'Performance example must update application state')
assert(monitor.snapshot().rendererUpdates > initialRendererUpdates, 'Performance plugin must count renderer updates')
performanceApp.dispose()
monitor.dispose()
performanceHost.remove()

document.body.dataset.matrixExtensionPatterns = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
