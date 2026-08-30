import {
  configure,
  createDevtools,
  createForm,
  createRouter,
  css,
  disposeStyle,
  html,
  jsx,
  mount,
  signal,
  usePlugin
} from '../src/index.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const host = document.createElement('div')
host.dataset.securityTests = 'runtime'
document.body.append(host)
window.__MATRIX_SECURITY_XSS__ = 0

const payloads = [
  '<script>window.__MATRIX_SECURITY_XSS__ += 1</script>',
  '<img src=x onerror="window.__MATRIX_SECURITY_XSS__ += 1">',
  '"><svg/onload="window.__MATRIX_SECURITY_XSS__ += 1">',
  "'><details open ontoggle='window.__MATRIX_SECURITY_XSS__ += 1'>",
  '</textarea><script>window.__MATRIX_SECURITY_XSS__ += 1</script>',
  '<svg><script>window.__MATRIX_SECURITY_XSS__ += 1</script></svg>',
  '<?xml version="1.0"?><svg onload="window.__MATRIX_SECURITY_XSS__ += 1">',
  '&lt;script&gt;window.__MATRIX_SECURITY_XSS__ += 1&lt;/script&gt;',
  'javascript:window.__MATRIX_SECURITY_XSS__ += 1',
  'data:text/html,<script>window.__MATRIX_SECURITY_XSS__ += 1</script>',
  '` onmouseover=`window.__MATRIX_SECURITY_XSS__ += 1',
  'a&amp;b < c > d " e \' f'
]

const fragments = [
  '<script>',
  '</script>',
  '<img src=x onerror=',
  '<svg onload=',
  '"',
  "'",
  '>',
  '<',
  '&',
  'javascript:',
  'data:text/html,',
  ' onfocus='
]
let randomState = 0x5eed
const nextRandom = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0
  return randomState
}

for (let index = 0; index < 64; index += 1) {
  const randomPayload = Array.from({ length: 5 }, () => fragments[nextRandom() % fragments.length]).join('')
  payloads.push(`${randomPayload}${index}`)
}

for (const payload of payloads) {
  const app = mount(() => html`
    <section data-security-case>
      <div data-text data-title=${payload} data-xml=${payload}>${payload}</div>
      <svg data-svg aria-label=${payload}>
        <title>${payload}</title>
        <text>${payload}</text>
      </svg>
      <input type="text" .value=${payload} @click=${payload}>
    </section>
  `, host)

  const section = host.querySelector('[data-security-case]')
  const textNode = section.querySelector('[data-text]')
  const svg = section.querySelector('[data-svg]')
  const input = section.querySelector('input')
  assert(textNode.textContent === payload, 'Malicious text must stay text')
  assert(textNode.getAttribute('data-title') === payload, 'Dynamic attributes must preserve data without parsing markup')
  assert(textNode.getAttribute('data-xml') === payload, 'XML-like payloads must stay attribute data')
  assert(svg.namespaceURI === 'http://www.w3.org/2000/svg', 'SVG payload fixtures must retain the SVG namespace')
  assert(svg.querySelector('title').textContent === payload, 'SVG text must stay escaped')
  assert(input.value === payload, 'Property bindings must preserve malicious data as a value')
  assert(section.querySelector('script, img, [onerror], [onload], [ontoggle], [onmouseover], [onfocus]') === null, 'Interpolated payloads must not create executable nodes or handlers')
  input.click()
  assert(window.__MATRIX_SECURITY_XSS__ === 0, 'Interpolated event strings must never execute')
  app.unmount()
}

let rawHtmlError
try {
  jsx('div', { dangerouslySetInnerHTML: { __html: payloads[0] } })
} catch (error) {
  rawHtmlError = error
}
assert(rawHtmlError?.message.includes('does not support dangerouslySetInnerHTML'), 'Raw HTML must remain an explicit unsupported boundary')

for (const unsafeUrl of [
  'javascript:window.__MATRIX_SECURITY_XSS__ += 1',
  'java\nscript:window.__MATRIX_SECURITY_XSS__ += 1',
  'vbscript:msgbox(1)',
  'data:text/html,<script>window.__MATRIX_SECURITY_XSS__ += 1</script>'
]) {
  let attributeError
  try {
    mount(() => html`<a href=${unsafeUrl}>unsafe</a>`, host)
  } catch (error) {
    attributeError = error
  }
  assert(attributeError?.message.includes('Unsafe dynamic URL'), 'Unsafe URL attributes must be rejected')
  assert(host.childNodes.length === 0, 'Rejected URL rendering must roll back partial DOM')

  let propertyError
  try {
    mount(() => html`<img .src=${unsafeUrl}>`, host)
  } catch (error) {
    propertyError = error
  }
  assert(propertyError?.message.includes('Unsafe dynamic URL'), 'Unsafe URL properties must be rejected')
  assert(host.childNodes.length === 0, 'Rejected URL properties must roll back partial DOM')
}

const redStyle = css`.security-probe { color: rgb(255, 0, 0); }`
const blueStyle = css`.security-probe { color: rgb(0, 0, 255); }`
const styleApp = mount(() => html`
  <div data-scope-red use:style=${redStyle}><span class="security-probe">red</span></div>
  <div data-scope-blue use:style=${blueStyle}><span class="security-probe">blue</span></div>
`, host)
const redScope = host.querySelector('[data-scope-red]')
const blueScope = host.querySelector('[data-scope-blue]')
assert(redScope.dataset.matrixScope === redStyle.id, 'Scoped styles must mark their own boundary')
assert(blueScope.dataset.matrixScope === blueStyle.id, 'Each scoped style must mark its own boundary')
assert(redScope.dataset.matrixScope !== blueScope.dataset.matrixScope, 'Different scoped styles must not share a boundary')
assert(getComputedStyle(redScope.querySelector('.security-probe')).color === 'rgb(255, 0, 0)', 'A scoped style must apply inside its own boundary')
assert(getComputedStyle(blueScope.querySelector('.security-probe')).color === 'rgb(0, 0, 255)', 'A scoped style must not leak another style into its boundary')
assert(redStyle.cssText.includes(`[data-matrix-scope="${redStyle.id}"]`), 'Scoped CSS must contain its boundary selector')
assert(blueStyle.cssText.includes(`[data-matrix-scope="${blueStyle.id}"]`), 'Each scoped CSS rule must contain its own boundary selector')
styleApp.unmount()
disposeStyle(redStyle)
disposeStyle(blueStyle)

const originalUrl = window.location.href
const router = createRouter([
  { path: '/', view: () => html`<p>home</p>` },
  { path: '/security/:value', view: () => html`<p>security</p>` }
])
router.start()
const routePayload = '<svg/onload="window.__MATRIX_SECURITY_XSS__ += 1">/encoded'
assert(await router.navigate(`/security/${encodeURIComponent(routePayload)}`, { scroll: false }), 'Same-origin encoded route navigation must succeed')
assert(router.current.value.params.value === routePayload, 'Route params must decode data without executing it')
assert(window.__MATRIX_SECURITY_XSS__ === 0, 'Malicious route params must not execute')

let crossOriginError
try {
  await router.navigate('https://evil.example/security/payload', { scroll: false })
} catch (error) {
  crossOriginError = error
}
assert(crossOriginError?.message.includes('same-origin'), 'Router must reject cross-origin navigation')

let javascriptUrlError
try {
  await router.navigate('javascript:window.__MATRIX_SECURITY_XSS__ += 1', { scroll: false })
} catch (error) {
  javascriptUrlError = error
}
assert(javascriptUrlError?.message.includes('same-origin'), 'Router must reject javascript URLs')

let malformedRouteError
try {
  await router.navigate('/security/%E0%A4%A', { scroll: false })
} catch (error) {
  malformedRouteError = error
}
assert(malformedRouteError?.message.includes('malformed percent-encoding'), 'Router must reject malformed encoded params clearly')
assert(await router.navigate('/security/hash#%E0%A4%A', { scroll: false }), 'Malformed hash encoding must not break safe navigation')
router.dispose()
window.history.replaceState({}, '', originalUrl)

const credentials = createForm({ password: '' }, {}, { name: 'security-credentials' })
const privacyDevtools = createDevtools({ globalName: null })
const passwordApp = mount(() => html`
  <form><input data-password type="password" use:bind=${credentials.fields.password}></form>
`, host)
const passwordInput = host.querySelector('[data-password]')
const secret = 'matrix-secret-not-for-dom-or-logs'
passwordInput.value = secret
passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
assert(credentials.fields.password.value === secret, 'Form binding must update the sensitive field')
assert(passwordInput.getAttribute('value') === null, 'Password values must not be reflected into HTML attributes')
assert(!host.textContent.includes(secret), 'Password values must not be rendered as text')
assert(!JSON.stringify(privacyDevtools.snapshot()).includes(secret), 'Default devtools snapshots must redact sensitive values')
passwordApp.unmount()
privacyDevtools.dispose()
credentials.reset()

configure({ development: true })
let failedInstallHookCalls = 0
let failedInstallError
try {
  usePlugin({
    install(api) {
      api.on('logger', () => {
        failedInstallHookCalls += 1
      })
      throw new Error('intentional install failure')
    }
  })
} catch (error) {
  failedInstallError = error
}
assert(failedInstallError?.message === 'intentional install failure', 'Failed plugin installation must report its error')

let loggerEvents = 0
const stopSecurityPlugin = usePlugin({
  install(api) {
    return api.on('logger', event => {
      if (event.type === 'form:validation-error') {
        loggerEvents += 1
      }
    })
  }
})
createForm({ field: '' }, { field: 'not-a-validator' })
assert(loggerEvents > 0, 'Documented plugin extension points must receive diagnostics')
assert(failedInstallHookCalls === 0, 'Failed plugin installations must not leave hooks registered')
stopSecurityPlugin()

let unknownPointError
try {
  usePlugin({ install: api => api.on('sandbox-break', () => {}) })
} catch (error) {
  unknownPointError = error
}
assert(unknownPointError?.message.includes('Unknown plugin extension point'), 'Plugins must not register undocumented extension points')

delete window.__MATRIX_SECURITY_XSS__
host.remove()
document.body.dataset.matrixSecurityTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
