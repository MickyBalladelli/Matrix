import {
  configure,
  createDevtools,
  createForm,
  createRouter,
  css,
  cssVariables,
  disposeStyle,
  html,
  jsx,
  mount,
  resource,
  signal,
  theme,
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

const entityValue = `&<>'"=\` ${'${not-a-template-expression}'}`
const entityApp = mount(() => html`
  <label data-entity title=${entityValue}>${entityValue}</label>
  <svg data-entity-svg>
    <text data-entity-text>${entityValue}</text>
    <foreignObject><span data-entity-html title=${entityValue}>${entityValue}</span></foreignObject>
  </svg>
  <input data-entity-input .value=${entityValue}>
`, host)
assert(host.querySelector('[data-entity]').textContent === entityValue, 'HTML entities must remain text content')
assert(host.querySelector('[data-entity]').getAttribute('title') === entityValue, 'HTML entities must remain ordinary attribute data')
assert(host.querySelector('[data-entity-text]').textContent === entityValue, 'HTML entities must remain SVG text content')
assert(host.querySelector('[data-entity-html]').namespaceURI === 'http://www.w3.org/1999/xhtml', 'foreignObject content must use the HTML namespace')
assert(host.querySelector('[data-entity-input]').value === entityValue, 'HTML entities must remain property values')
assert(host.querySelector('script, img, [onerror], [onload]') === null, 'Entity payloads must not create executable markup')
entityApp.unmount()

let rawHtmlError
try {
  jsx('div', { dangerouslySetInnerHTML: { __html: payloads[0] } })
} catch (error) {
  rawHtmlError = error
}
assert(rawHtmlError?.message.includes('does not support dangerouslySetInnerHTML'), 'Raw HTML must remain an explicit unsupported boundary')

const svgEdgeApp = mount(() => html`
  <svg data-svg-edge>
    <defs><symbol id="security-symbol"><circle cx="2" cy="2" r="2"></circle></symbol></defs>
    <use data-svg-use href="#security-symbol"></use>
    <foreignObject data-svg-foreign><textarea data-svg-textarea></textarea></foreignObject>
  </svg>
`, host)
assert(host.querySelector('[data-svg-edge]').namespaceURI === 'http://www.w3.org/2000/svg', 'SVG roots must retain the SVG namespace')
assert(host.querySelector('[data-svg-use]').namespaceURI === 'http://www.w3.org/2000/svg', 'SVG descendants must retain the SVG namespace')
assert(host.querySelector('[data-svg-use]').getAttribute('href') === '#security-symbol', 'SVG fragment references must remain safe URL data')
assert(host.querySelector('[data-svg-textarea]').namespaceURI === 'http://www.w3.org/1999/xhtml', 'HTML controls inside foreignObject must use the HTML namespace')
svgEdgeApp.unmount()

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

const safeImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const safeImageApp = mount(() => html`<img data-safe-image src=${safeImageDataUrl} alt="safe">`, host)
assert(host.querySelector('[data-safe-image]')?.getAttribute('src') === safeImageDataUrl, 'Safe image data URLs must be allowed on src')
safeImageApp.unmount()

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

let invalidCssNameError
try {
  cssVariables({ color: 'red' })
} catch (error) {
  invalidCssNameError = error
}
assert(invalidCssNameError?.message.includes('must start with --'), 'CSS variables must reject non-custom-property names')

let invalidCssValueError
try {
  cssVariables({ '--security-value': 'red; --leaked: blue' })
} catch (error) {
  invalidCssValueError = error
}
assert(invalidCssValueError?.message.includes('Unsafe CSS custom property value'), 'CSS variables must reject declaration injection')

let invalidThemeError
try {
  theme({ light: { '--security-theme': 'red } body { color: red' } })
} catch (error) {
  invalidThemeError = error
}
assert(invalidThemeError?.message.includes('Unsafe CSS custom property value'), 'Themes must reject CSS rule injection')

const safeCssValue = signal('ok')
const safeVariables = cssVariables({ '--security-value': safeCssValue })
const safeVariablesApp = mount(() => html`<div data-safe-vars use:vars=${safeVariables}>safe</div>`, host)
assert(host.querySelector('[data-safe-vars]').style.getPropertyValue('--security-value') === 'ok', 'Safe CSS custom-property values must apply')
let reactiveCssValueError
try {
  safeCssValue.value = 'red; --leaked: blue'
} catch (error) {
  reactiveCssValueError = error
}
assert(reactiveCssValueError?.message.includes('Unsafe CSS custom property value'), 'Reactive CSS custom-property updates must be validated')
assert(host.querySelector('[data-safe-vars]').style.getPropertyValue('--security-value') === 'ok', 'Rejected CSS values must not replace the last safe value')
safeVariablesApp.unmount()

const entityVariableValue = 'rgb(1, 2, 3)'
const entityVariable = cssVariables({ '--entity-value': entityVariableValue })
const entityVariableApp = mount(() => html`<div data-entity-vars use:vars=${entityVariable}>vars</div>`, host)
assert(host.querySelector('[data-entity-vars]').style.getPropertyValue('--entity-value') === entityVariableValue, 'CSS custom-property values must remain CSS data')
entityVariableApp.unmount()

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
const specialRoutePayload = `a/b ?#&=${entityValue}`
assert(await router.navigate(`/security/${encodeURIComponent(specialRoutePayload)}`, { scroll: false }), 'Router params with special characters must navigate')
assert(router.current.value.params.value === specialRoutePayload, 'Router params must decode special characters as data')
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

const sanitizedForm = createForm({ displayName: '' })
const sanitizeDisplayName = value => String(value).replace(/[<>]/g, '')
const sanitizedFormApp = mount(() => html`
  <input data-sanitized-name use:bind=${{ source: sanitizedForm.fields.displayName, sanitize: sanitizeDisplayName }}>
`, host)
const sanitizedInput = host.querySelector('[data-sanitized-name]')
sanitizedInput.value = '<b>Ada</b>'
sanitizedInput.dispatchEvent(new Event('input', { bubbles: true }))
assert(sanitizedForm.fields.displayName.value === 'bAda/b', 'Form binding must apply its explicit sanitizer before writing')
sanitizedFormApp.unmount()
sanitizedForm.reset()

let invalidSanitizerError
try {
  mount(() => html`<input use:bind=${{ source: signal(''), sanitize: 'not-a-function' }}>`, host)
} catch (error) {
  invalidSanitizerError = error
}
assert(invalidSanitizerError?.message.includes('sanitize expects a function'), 'Invalid form sanitizers must fail clearly')
assert(host.childNodes.length === 0, 'Invalid form sanitizer binding must roll back the DOM')

const untrustedResourceUrl = 'javascript:window.__MATRIX_SECURITY_XSS__ += 1'
let receivedResourceUrl
const untrustedUrlResource = resource(async (url, requestSignal) => {
  receivedResourceUrl = url
  assert(requestSignal instanceof AbortSignal, 'Resource loaders must receive an abort signal')
  const parsed = new URL(url, window.location.href)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== window.location.origin) {
    throw new Error('Resource loader rejected an untrusted URL')
  }
  return parsed.pathname
})
await untrustedUrlResource.reload(untrustedResourceUrl).catch(() => {})
assert(receivedResourceUrl === untrustedResourceUrl, 'Resource loaders must receive untrusted URLs for application validation')
assert(untrustedUrlResource.status.value === 'error', 'A resource loader must be able to reject an untrusted URL')
assert(window.__MATRIX_SECURITY_XSS__ === 0, 'Untrusted resource URLs must not execute')
untrustedUrlResource.dispose()

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
