import { computed, html, mount, signal, usePlugin } from '../../../src/index.js'

function accessibleName(element) {
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map(id => element.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim()
    if (text) return text
  }
  if (element.hasAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim()
  }
  const clone = element.cloneNode(true)
  for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove()
  return (clone.textContent ?? '').trim()
}

function auditRoot(root) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return []
  }

  const violations = []
  for (const element of root.querySelectorAll('button, a, input, select, textarea, img')) {
    const tagName = element.tagName.toLowerCase()
    if (tagName === 'img' && !element.hasAttribute('alt')) {
      violations.push({ rule: 'image-alt', message: 'Images need an alt attribute' })
    }
    if (['button', 'a'].includes(tagName) && !accessibleName(element)) {
      violations.push({ rule: 'control-name', message: `${tagName} needs an accessible name` })
    }
    if (['input', 'select', 'textarea'].includes(tagName) && element.type !== 'hidden' && !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      violations.push({ rule: 'form-label', message: `${tagName} needs a label` })
    }
  }
  return violations
}

export function createA11yAuditPlugin(options = {}) {
  const root = options.root
  const report = options.report ?? (() => {})
  const violations = signal([], { name: 'a11y-violations' })
  let queued = false
  let lastReport = ''

  function audit() {
    const nextViolations = auditRoot(root)
    const signature = JSON.stringify(nextViolations)
    if (signature === lastReport) {
      return violations.peek()
    }
    lastReport = signature
    violations.value = nextViolations
    report(nextViolations)
    return nextViolations
  }

  function queueAudit() {
    if (queued) return
    queued = true
    const flush = () => {
      queued = false
      audit()
    }
    if (typeof queueMicrotask === 'function') queueMicrotask(flush)
    else Promise.resolve().then(flush)
  }

  return {
    violations,
    audit,
    install(api) {
      return api.on('renderer', event => {
        const target = event.element ?? event.parent
        if (target && (target === root || root?.contains?.(target))) queueAudit()
      })
    },
    dispose() {
      violations.dispose()
    }
  }
}

export function mountA11yAuditApp(container, options = {}) {
  const auditor = options.auditor ?? createA11yAuditPlugin({ root: container, report: options.report })
  const stopAuditor = usePlugin(auditor)
  const showIssue = signal(false)
  const status = computed(() => auditor.violations.value.length === 0
    ? 'No violations found'
    : `${auditor.violations.value.length} violation(s) found`)
  const violationRows = computed(() => auditor.violations.value.map(violation => html`<li>${violation.rule}: ${violation.message}</li>`))

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>Accessibility audit plugin</h1>
      <p>The renderer hook reruns a small native-DOM audit after dynamic updates.</p>
      <button data-a11y-toggle @click=${() => showIssue.value = !showIssue.value}>Toggle demo issue</button>
      ${computed(() => showIssue.value
        ? html`<button data-a11y-bad><span aria-hidden="true">×</span></button>`
        : html`<p data-a11y-clean class="muted">All controls currently have names.</p>`)}
      <p data-a11y-status class="status" aria-live="polite">${status}</p>
      <ul data-a11y-violations class="audit-list">${violationRows}</ul>
    </main>
  `, container)
  auditor.audit()

  return {
    app,
    auditor,
    showIssue,
    status,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      stopAuditor()
      status.dispose()
      violationRows.dispose()
      showIssue.dispose()
      if (!options.auditor) auditor.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountA11yAuditApp(document.querySelector('#app'))
}
