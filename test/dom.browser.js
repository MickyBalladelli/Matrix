import {
  component,
  computed,
  configure,
  createDevtools,
  css,
  cssVariables,
  createForm,
  createRouter,
  disposeStyle,
  errorBoundary,
  getRuntimeConfig,
  html,
  jsx,
  keyed,
  globalCss,
  mount,
  onMount,
  onUnmount,
  resource,
  inspectEffects,
  signal,
  usePlugin
} from '../src/index.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const host = document.createElement('div')
document.body.append(host)
const devtools = createDevtools({ globalName: null, redact: false })

const count = signal(0)
const doubled = computed(() => count.value * 2)
const style = css`.box { color: var(--accent) }`
const accent = signal('tomato')
let mounted = false
let unmounted = false

const Child = () => {
  onMount(() => {
    mounted = true
  })
  onUnmount(() => {
    unmounted = true
  })
  return html`<span class="child">child</span>`
}

const app = mount(() => html`
  <main use:style=${style} use:vars=${cssVariables({ '--accent': accent })} class="box">
    <button @click=${() => count.update(value => value + 1)}>${count}</button>
    <output>${doubled}</output>
    <input use:bind=${count}>
    ${component(Child)}
    ${keyed(signal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]), item => item.id)}
  </main>
`, host)

const button = host.querySelector('button')
const input = host.querySelector('input')

assert(button.textContent === '0', 'Initial text must render')
assert(host.querySelector('output').textContent === '0', 'Computed value must render')
assert(mounted, 'onMount must be called')
const componentTree = devtools.components()
assert(componentTree.some(node => node.children.some(child => child.name === 'Child')), 'DevTools must expose the component tree')

const escaped = signal('<strong>unsafe</strong>')
const escapeApp = mount(() => html`<p>${escaped}</p>`, host)
assert(!escapeApp.nodes.some(node => node.querySelector?.('strong')), 'Dynamic text must be escaped')
assert(escapeApp.nodes.find(node => node.nodeName === 'P').textContent === '<strong>unsafe</strong>', 'Escaped text must remain readable')
escapeApp.unmount()

const svg = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg')
assert(svg.namespaceURI === 'http://www.w3.org/2000/svg', 'The document must support SVG')

button.click()
assert(button.textContent === '1', 'Text must follow the signal')
assert(input.value === '1', 'Input binding must follow the signal')

input.value = '3'
input.dispatchEvent(new Event('input', { bubbles: true }))
assert(count.value === '3', 'Input binding must write to the signal')

accent.value = 'blue'
assert(host.querySelector('[data-matrix-scope]'), 'Scoped style must add a scope')
assert(document.querySelector('style[data-matrix-style]'), 'Style must be injected')
assert(host.querySelector('.box').style.getPropertyValue('--accent') === 'blue', 'CSS variable must be reactive')

app.unmount()
assert(unmounted, 'onUnmount must be called')
assert(host.childNodes.length === 0, 'Unmount must remove the DOM')

const Counter = () => {
  const local = signal(0)
  return html`<button @click=${() => local.update(value => value + 1)}>${local}</button>`
}

const isolatedApp = mount(() => html`${component(Counter)}${component(Counter)}`, host)
const counters = host.querySelectorAll('button')
counters[0].click()
assert(counters[0].textContent === '1' && counters[1].textContent === '0', 'Each component must isolate its state')
isolatedApp.unmount()

const bad = () => {
  throw new Error('boom')
}
const boundaryApp = mount(() => html`
  ${errorBoundary(() => component(bad), error => html`<strong>${error.message}</strong>`)}
`, host)
assert(host.querySelector('strong').textContent.includes('boom'), 'Boundary must render the fallback')
boundaryApp.unmount()

let namedError
try {
  mount(() => component(bad), host)
} catch (error) {
  namedError = error
}
assert(namedError?.message.includes('[bad]'), 'Errors must include the component')
assert(namedError?.stack?.includes('dom.browser.js'), 'The stack must point to the user component')

const diagnosticEvents = []
const diagnosticPlugin = usePlugin({
  install(api) {
    return api.on('logger', event => diagnosticEvents.push(event))
  }
})

const InvalidOutput = () => ({ invalid: true })
const invalidOutputApp = mount(() => component(InvalidOutput), host)
assert(host.textContent.includes('[object Object]'), 'Invalid output must remain visible as text')
assert(diagnosticEvents.some(event => event.type === 'component:invalid-output' && event.name === 'InvalidOutput'), 'Invalid component output must emit a diagnostic')
invalidOutputApp.unmount()

let duplicateKeyError
try {
  mount(() => html`${keyed([{ id: 1 }, { id: 1 }], item => item.id)}`, host)
} catch (error) {
  duplicateKeyError = error
}
assert(duplicateKeyError?.message.includes('Duplicate list key: 1'), 'Duplicate keys must fail clearly')
assert(diagnosticEvents.some(event => event.type === 'list:duplicate-key' && event.key === 1), 'A duplicate key must emit a diagnostic before the error')
diagnosticPlugin()

const previousDevelopmentConfig = getRuntimeConfig()
const developmentEvents = []
const developmentPlugin = usePlugin({
  install(api) {
    return api.on('logger', event => developmentEvents.push(event))
  }
})
configure({ development: true, bindingWarningThreshold: 1 })

try {
  html`<p>{count}</p>`
  const largeBindingView = html`<p>${count}${doubled}</p>`
  const largeBindingApp = mount(() => largeBindingView, host)
  largeBindingApp.unmount()

  const developmentRouter = createRouter([
    { path: '/*rest', view: () => html`<p>catch all</p>` },
    { path: '/later', view: () => html`<p>later</p>` }
  ])
  developmentRouter.dispose()
} finally {
  developmentPlugin()
  configure(previousDevelopmentConfig)
}

assert(developmentEvents.some(event => event.type === 'template:forgotten-interpolation'), 'A forgotten interpolation must emit a diagnostic')
assert(developmentEvents.some(event => event.type === 'performance:unoptimized-bindings'), 'An over-bound template must emit a performance warning')
assert(developmentEvents.some(event => event.type === 'router:misconfiguration' && event.issue === 'catch-all-order'), 'A misplaced catch-all route must emit a diagnostic')

let templateError
try {
  html('<p>')
} catch (error) {
  templateError = error
}
assert(templateError, 'A malformed template call must produce a clear error')

let callbackValue = ''
const PropChild = props => html`<button @click=${() => props.onChange(props.label)}>${props.label}</button>`
const propsApp = mount(() => component(PropChild, {
  label: 'child',
  onChange(value) {
    callbackValue = value
  }
}), host)
host.querySelector('button').click()
assert(callbackValue === 'child', 'Child-to-parent callbacks must work')
propsApp.unmount()

const stableCounter = id => component(({ label }) => {
  const local = signal(0)
  return html`<button data-id=${label} @click=${() => local.update(value => value + 1)}>${local}</button>`
}, { label: id })
const keyedItems = signal([stableCounter('one'), stableCounter('two')])
const keyedApp = mount(() => html`${keyed(keyedItems, item => item.props.label)}`, host)
const keyedButtons = host.querySelectorAll('button')
keyedButtons[0].click()
keyedItems.value = [keyedItems.value[1], keyedItems.value[0]]
const reorderedButtons = host.querySelectorAll('button')
assert(reorderedButtons[1].textContent === '1', 'A stable key must preserve moved state')
keyedItems.value = [stableCounter('new'), keyedItems.value[0]]
assert(host.querySelectorAll('button')[0].textContent === '0', 'A new key must create new state')
keyedApp.unmount()

function StatefulProps(props) {
  const local = signal(0)
  return html`<button data-prop-id=${props.id} @click=${() => local.update(value => value + 1)}>${props.label}:${local}</button>`
}

const propItems = signal([component(StatefulProps, { id: 'same', label: 'before' })])
const propApp = mount(() => html`${keyed(propItems, item => item.props.id)}`, host)
host.querySelector('button').click()
propItems.value = [component(StatefulProps, { id: 'same', label: 'after' })]
assert(host.querySelector('button').textContent === 'after:1', 'An updated prop must preserve local state')
propApp.unmount()

const composed = signal('')
const formApp = mount(() => html`<input use:bind=${composed}>`, host)
const formInput = host.querySelector('input')
formInput.dispatchEvent(new CompositionEvent('compositionstart'))
formInput.value = 'é'
formInput.dispatchEvent(new Event('input'))
assert(composed.value === '', 'IME composition must not write too early')
formInput.dispatchEvent(new CompositionEvent('compositionend'))
assert(composed.value === 'é', 'IME composition must write at the end')
formApp.unmount()

let touched = 0
const touchApp = mount(() => html`<button @touchstart=${() => touched += 1}>touch</button>`, host)
host.querySelector('button').dispatchEvent(new Event('touchstart', { bubbles: true }))
assert(touched === 1, 'Touch events must work')
touchApp.unmount()

let pressed = ''
const keyboardApp = mount(() => html`<input @keydown=${event => pressed = event.key}>`, host)
host.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
assert(pressed === 'Enter', 'Keyboard events must work')
keyboardApp.unmount()

const repeatedView = () => html`<i>repeat</i>`
const firstMount = mount(repeatedView, host)
const secondMount = mount(repeatedView, host)
assert(host.querySelectorAll('i').length === 2, 'A view must be mountable multiple times')
firstMount.unmount()
secondMount.unmount()

const replacement = signal(html`<p>before</p>`)
const replacementApp = mount(() => html`${replacement}`, host)
replacement.value = html`<p>after</p>`
assert(host.querySelector('p').textContent === 'after', 'A dynamic view must be replaceable')
replacementApp.unmount()

const longText = 'x'.repeat(100000)
const longValue = signal(longText)
const longApp = mount(() => html`<p>${longValue}</p>`, host)
assert(host.querySelector('p').textContent.length === longText.length, 'Long text must render')
longApp.unmount()

const styleA = css`.same { color: red }`
const styleB = css`.same { color: blue }`
const global = globalCss('.global { display: block }')
const styleApp = mount(() => html`
  <div use:style=${styleA} class="same">a</div>
  <div use:style=${styleA} class="same">a2</div>
  <div use:style=${styleB} class="same">b</div>
  <div use:style=${global} class="global">g</div>
`, host)
const styledNodes = host.querySelectorAll('.same')
assert(styledNodes[0].dataset.matrixScope === styledNodes[1].dataset.matrixScope, 'A shared style must keep its scope')
assert(styledNodes[0].dataset.matrixScope !== styledNodes[2].dataset.matrixScope, 'Scoped styles must stay isolated')
assert(document.querySelectorAll(`style[data-matrix-style="${styleA.id}"]`).length === 1, 'An identical style must be injected once')
assert(!host.querySelector('.global').dataset.matrixScope, 'A global style must not add a scope')
styleApp.unmount()

const pseudoStyle = css`.button:hover::before { content: 'x' }`
const pseudoApp = mount(() => html`<button use:style=${pseudoStyle} class="button">pseudo</button>`, host)
const pseudoCss = document.querySelector(`style[data-matrix-style="${pseudoStyle.id}"]`).textContent
assert(pseudoCss.includes(':hover') && pseudoCss.includes('::before'), 'Pseudo-classes and pseudo-elements must remain in CSS')
pseudoApp.unmount()

const themeMode = signal('light')
const surface = computed(() => themeMode.value === 'light' ? '#fff' : '#111')
const themeApp = mount(() => html`<div use:vars=${cssVariables({ '--surface': surface })}>theme</div>`, host)
const themeNode = themeApp.nodes.find(node => node.nodeName === 'DIV')
assert(themeNode.style.getPropertyValue('--surface') === '#fff', 'Initial theme must be applied')
themeMode.value = 'dark'
assert(themeNode.style.getPropertyValue('--surface') === '#111', 'Theme changes must be reactive')
themeApp.unmount()

const nullable = signal(null)
const valuesApp = mount(() => html`<div use:vars=${cssVariables({ '--nullable': nullable, '--empty': '' })}>values</div>`, host)
const valuesNode = valuesApp.nodes.find(node => node.nodeName === 'DIV')
assert(valuesNode.style.getPropertyValue('--nullable') === '', 'A null variable must be removed')
nullable.value = 'ok'
assert(valuesNode.style.getPropertyValue('--nullable') === 'ok', 'An empty variable must be allowed to become valid')
nullable.value = false
assert(valuesNode.style.getPropertyValue('--nullable') === '', 'A false variable must be removed')
valuesApp.unmount()

let invalidVariables
try {
  cssVariables(null)
} catch (error) {
  invalidVariables = error
}
assert(invalidVariables instanceof TypeError, 'Invalid CSS variables must produce an error')

const disposableStyle = css`.temporary { color: purple }`
const disposableApp = mount(() => html`<div use:style=${disposableStyle} class="temporary">temp</div>`, host)
assert(document.querySelector(`style[data-matrix-style="${disposableStyle.id}"]`), 'Temporary style must be present')
assert(disposeStyle(disposableStyle), 'disposeStyle must remove an injected stylesheet')
assert(!document.querySelector(`style[data-matrix-style="${disposableStyle.id}"]`), 'Removed stylesheet must leave the document')
disposableApp.unmount()

const form = createForm({ email: '' }, {
  email: value => value.includes('@') ? undefined : 'invalid email'
})
assert(!form.valid.value, 'An invalid form must expose valid=false')
form.fields.email.value = 'grog@example.com'
assert(Object.keys(form.validate()).length === 0 && form.valid.value, 'Validation must follow Signals')

const originalPath = window.location.pathname
const router = createRouter([
  { path: '/', view: () => html`<p>home</p>` },
  { path: '/matrix-user/:id', view: () => html`<p>user</p>` }
])
router.start()
assert(devtools.routers().some(item => item.started && item.routes.length === 2), 'DevTools must expose router state')
assert(await router.navigate('/matrix-user/7?tab=profile#details'), 'Router must navigate')
assert(router.current.value.params.id === '7', 'Router must extract parameters')
assert(router.search.value === '?tab=profile' && router.hash.value === '#details', 'Router must preserve search and hash')
await router.navigate('/')
await router.navigate('/matrix-user/7')
const backNavigation = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }))
window.history.back()
await backNavigation
assert(router.path.value === '/', 'Router must follow the back button')
router.stop()
window.history.replaceState({}, '', originalPath)

const asyncResource = resource(async value => value * 2)
await asyncResource.reload(4)
assert(asyncResource.status.value === 'success' && asyncResource.data.value === 8, 'Resource must expose its result')
const failedResource = resource(async () => {
  throw new Error('failure')
})
await failedResource.reload().catch(() => {})
assert(failedResource.status.value === 'error' && failedResource.error.value instanceof Error, 'Resource must expose errors')

const pluginEvents = []
const pluginText = signal('plugin')
const stopPlugin = usePlugin({
  install(api) {
    return api.on('renderer', event => pluginEvents.push(event.type))
  }
})
const pluginApp = mount(() => html`<span>${pluginText}</span>`, host)
assert(pluginEvents.includes('dom:update'), 'A plugin must be able to observe the renderer')
pluginApp.unmount()
stopPlugin()

const disposedSignal = signal('alive')
const disposedApp = mount(() => html`<span>${disposedSignal}</span>`, host)
disposedApp.unmount()
disposedSignal.value = 'gone'
assert(host.textContent === '', 'No DOM effect must survive unmount')

const styleObject = signal({ color: 'red', 'background-color': 'blue' })
const styleObjectApp = mount(() => html`<div style=${styleObject}>style object</div>`, host)
const styleObjectNode = host.querySelector('div')
styleObject.value = { color: 'green' }
assert(styleObjectNode.style.color === 'green', 'Object style must update retained properties')
assert(styleObjectNode.style.backgroundColor === '', 'Object style must remove missing properties')
styleObjectApp.unmount()

let chainedEvents = 0
const chainedEventApp = mount(() => jsx('button', {
  onClickCaptureOncePrevent: event => {
    assert(event.defaultPrevented, 'Prevent modifier must run before the handler')
    chainedEvents += 1
  },
  children: 'chained event'
}), host)
const chainedEventButton = host.querySelector('button')
chainedEventButton.click()
chainedEventButton.click()
assert(chainedEvents === 1, 'Chained event modifiers must all apply')
chainedEventApp.unmount()

const keyedJsxItems = signal([
  jsx(StatefulProps, { id: 'first', label: 'first' }, 'first'),
  jsx(StatefulProps, { id: 'second', label: 'second' }, 'second')
])
const keyedJsxApp = mount(() => html`${keyed(keyedJsxItems)}`, host)
host.querySelector('button').click()
keyedJsxItems.value = [keyedJsxItems.value[1], keyedJsxItems.value[0]]
assert(host.querySelectorAll('button')[1].textContent === 'first:1', 'JSX runtime keys must preserve component state')
keyedJsxApp.unmount()

const complexStyle = css`
  :is(.first, .second) { color: red }
  @media (min-width: 1px) { .inside { display: block } }
  @keyframes matrix-test { from { opacity: 0 } to { opacity: 1 } }
`
const complexStyleApp = mount(() => html`<div use:style=${complexStyle} class="first inside">complex</div>`, host)
const complexCss = document.querySelector(`style[data-matrix-style="${complexStyle.id}"]`).textContent
assert(complexCss.includes(':is(.first, .second)'), 'Scoped CSS must preserve commas inside modern selectors')
assert(complexCss.includes('@media') && complexCss.includes('@keyframes'), 'Scoped CSS must preserve at-rules and keyframes')
complexStyleApp.unmount()

let unsafeUrlError
try {
  mount(() => html`<a href=${'java\nscript:alert(1)'}>unsafe</a>`, host)
} catch (error) {
  unsafeUrlError = error
}
assert(unsafeUrlError instanceof Error, 'Dynamic URLs must reject obfuscated script schemes')

const idempotentApp = mount(() => html`<p>idempotent</p>`, host)
idempotentApp.unmount()
idempotentApp.unmount()
assert(host.textContent === '', 'Unmount must be idempotent')

const partialFailureValue = {
  toString() {
    throw new Error('partial failure')
  }
}
const partialFailure = () => html`
  <span data-partial>partial</span>
  <a href=${partialFailureValue}>broken</a>
`
const partialBoundaryApp = mount(() => errorBoundary(
  () => component(partialFailure),
  error => html`<strong data-fallback>${error.message}</strong>`
), host)
assert(host.querySelector('[data-fallback]')?.textContent?.includes('partial failure'), 'An error after insertion must reach the boundary')
assert(!host.querySelector('[data-partial]'), 'Partial insertion must be rolled back')
partialBoundaryApp.unmount()

const lifecycleFailure = () => {
  onMount(() => {
    throw new Error('mount failure')
  })
  return html`<span data-lifecycle>bad lifecycle</span>`
}
const lifecycleBoundaryApp = mount(() => errorBoundary(
  () => component(lifecycleFailure),
  error => html`<strong data-lifecycle-fallback>${error.message}</strong>`
), host)
assert(host.querySelector('[data-lifecycle-fallback]')?.textContent?.includes('mount failure'), 'A lifecycle error must reach the boundary')
assert(!host.querySelector('[data-lifecycle]'), 'Errored lifecycle DOM must be removed')
lifecycleBoundaryApp.unmount()

const deepFailure = () => {
  throw new Error('deep failure')
}
const middleFailure = () => component(deepFailure)
const treeBoundaryApp = mount(() => errorBoundary(
  () => component(middleFailure),
  error => html`<strong data-tree-fallback>${error.message}</strong>`
), host)
assert(host.querySelector('[data-tree-fallback]')?.textContent?.includes('deep failure'), 'Errors must bubble through the tree')
treeBoundaryApp.unmount()

const effectsBeforeCycles = inspectEffects().length
const RepeatedMount = () => {
  const local = signal(0)
  return html`<button>${local}</button>`
}
for (let index = 0; index < 1000; index += 1) {
  const cycleApp = mount(RepeatedMount, host)
  cycleApp.unmount()
}
assert(inspectEffects().length === effectsBeforeCycles, 'Repeated mounts must not leak effects')

const keyedLeakItems = signal([])
const KeyedLeakItem = () => {
  const local = signal(0)
  return html`<span>${local}</span>`
}
const keyedLeakApp = mount(() => html`${keyed(keyedLeakItems, item => item.props.id)}`, host)
const effectsBeforeKeyedCycles = inspectEffects().length
for (let index = 0; index < 1000; index += 1) {
  keyedLeakItems.value = [component(KeyedLeakItem, { id: index })]
  keyedLeakItems.value = []
}
assert(inspectEffects().length === effectsBeforeKeyedCycles, 'Keyed replacements must not leak effects')
keyedLeakApp.unmount()

const debouncedValue = signal('')
const debounceApp = mount(() => html`<input use:bind=${{ source: debouncedValue, debounce: 10 }}>`, host)
const debounceInput = host.querySelector('input')
debounceInput.value = 'late'
debounceInput.dispatchEvent(new Event('input'))
debounceApp.unmount()
await new Promise(resolve => setTimeout(resolve, 20))
assert(debouncedValue.value === '', 'Debounce must be canceled on unmount')

const cycleRouter = createRouter([])
for (let index = 0; index < 1000; index += 1) {
  cycleRouter.start()
  cycleRouter.stop()
}
cycleRouter.dispose()
let disposedRouterError
try {
  cycleRouter.start()
} catch (error) {
  disposedRouterError = error
}
assert(disposedRouterError?.message.includes('disposed router'), 'Disposed router must reject a new start')

const themeLeakValue = signal('red')
const themeLeakStyle = css`.theme-leak { color: var(--theme-leak) }`
const themeLeakApp = mount(() => html`
  <div use:style=${themeLeakStyle} use:vars=${cssVariables({ '--theme-leak': themeLeakValue })} class="theme-leak">theme</div>
`, host)
const effectsBeforeTheme = inspectEffects().length
for (let index = 0; index < 1000; index += 1) {
  themeLeakValue.value = index % 2 === 0 ? 'red' : 'blue'
}
themeLeakApp.unmount()
assert(inspectEffects().length === effectsBeforeTheme - 1, 'Theme changes must clean up their effect')

let abortCount = 0
const resourceApp = mount(() => {
  const pending = resource(signalValue => new Promise((resolve, reject) => {
    signalValue.addEventListener('abort', () => {
      abortCount += 1
      reject(new DOMException('aborted', 'AbortError'))
    }, { once: true })
  }), { immediate: true })
  return html`<span>${pending.data}</span>`
}, host)
resourceApp.unmount()
await new Promise(resolve => setTimeout(resolve, 0))
assert(abortCount === 1, 'Aborted resource must cancel its load')

const largeItems = signal(Array.from({ length: 10000 }, (_, index) => index))
const largeListApp = mount(() => html`${keyed(largeItems)}`, host)
largeItems.value = [...largeItems.value].reverse()
assert(host.textContent.startsWith('9999'), 'A large keyed list must reorder')
largeListApp.unmount()

// Dynamic values must not track signals read while rendering their content.
// Without clearing the observer, onMount writes to those signals loop forever.
{
  const tick = signal(0)
  function Canvas() {
    tick.value
    onMount(() => {
      tick.value += 1
    })
    return html`<canvas data-tick="1"></canvas>`
  }
  const layer = computed(() => component(Canvas))
  const loopHost = document.createElement('div')
  host.append(loopHost)
  let loopError
  try {
    mount(() => html`${layer}`, loopHost)
  } catch (error) {
    loopError = error
  }
  assert(!loopError, `Dynamic content render must not loop (${loopError?.message ?? 'ok'})`)
  assert(loopHost.querySelector('canvas'), 'Canvas content must mount once')
  assert(tick.peek() === 1, 'onMount may write once without retriggering the dynamic-value effect')
  loopHost.remove()
}

document.body.dataset.matrixTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
devtools.dispose()
