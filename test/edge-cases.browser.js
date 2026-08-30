import {
  component,
  createForm,
  createRouter,
  css,
  disposeStyle,
  effect,
  html,
  inspectEffects,
  mount,
  onMount,
  onUnmount,
  signal
} from '../src/index.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const createHost = name => {
  const host = document.createElement('div')
  host.dataset.edgeCase = name
  document.body.append(host)
  return host
}

const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

// A cleanup write must not re-render DOM that is already being unmounted.
const unmountHost = createHost('rerender-during-unmount')
const unmountValue = signal('before')
let unmountCleanups = 0
function RerenderDuringUnmount() {
  onUnmount(() => {
    unmountCleanups += 1
    unmountValue.value = 'during unmount'
  })
  return html`<span data-unmount-value>${unmountValue}</span>`
}
const unmountApp = mount(RerenderDuringUnmount, unmountHost)
assert(unmountHost.querySelector('[data-unmount-value]').textContent === 'before', 'Unmount test must render its initial value')
unmountApp.unmount()
assert(unmountCleanups === 1 && unmountValue.value === 'during unmount', 'Unmount cleanup must be allowed to update its source')
assert(unmountHost.childNodes.length === 0, 'Unmount cleanup must not recreate removed DOM')
unmountValue.dispose()
unmountHost.remove()

// Cleanup may update another signal while the effect is stopping or re-running.
const cleanupSource = signal(0)
const triggerSource = signal(0)
let cleanupRuns = 0
let effectRuns = 0
const stopCleanupEffect = effect(() => {
  triggerSource.value
  effectRuns += 1
  return () => {
    cleanupRuns += 1
    cleanupSource.value += 1
  }
}, { name: 'edge-cleanup-writer' })
triggerSource.value = 1
assert(effectRuns === 2 && cleanupRuns === 1 && cleanupSource.value === 1, 'Effect cleanup must safely update a signal')
stopCleanupEffect()
assert(cleanupRuns === 2 && cleanupSource.value === 2, 'Final effect cleanup must run exactly once')
cleanupSource.dispose()
triggerSource.dispose()

// A mount callback may update state before the first paint completes.
const mountHost = createHost('component-update-during-mount')
const mountedState = signal(false)
let mountCallbackCalled = false
function UpdatesDuringMount() {
  onMount(() => {
    mountCallbackCalled = true
    mountedState.value = true
  })
  return html`<span data-mounted-state>${mountedState}</span>`
}
const mountApp = mount(UpdatesDuringMount, mountHost)
assert(mountCallbackCalled && mountedState.value, 'Mount callback must run and update state')
assert(mountHost.querySelector('[data-mounted-state]').textContent === 'true', 'State updated during mount must render')
mountApp.unmount()
mountedState.dispose()
mountHost.remove()

// Router navigation is valid from both lifecycle callbacks.
const originalUrl = window.location.href
const lifecycleRouter = createRouter([
  { path: '/', view: () => html`<p>home</p>` },
  { path: '/mounted', view: () => html`<p>mounted</p>` },
  { path: '/unmounted', view: () => html`<p>unmounted</p>` }
])
lifecycleRouter.start()
let mountNavigation
let unmountNavigation
const routerHost = createHost('router-lifecycle')
function NavigatesInLifecycle() {
  onMount(() => {
    mountNavigation = lifecycleRouter.navigate('/mounted')
  })
  onUnmount(() => {
    unmountNavigation = lifecycleRouter.navigate('/unmounted')
  })
  return html`<p data-router-lifecycle>lifecycle</p>`
}
const routerApp = mount(NavigatesInLifecycle, routerHost)
await mountNavigation
assert(lifecycleRouter.path.value === '/mounted', 'Component mount must be able to navigate the router')
routerApp.unmount()
await unmountNavigation
assert(lifecycleRouter.path.value === '/unmounted', 'Component unmount must be able to navigate the router')
lifecycleRouter.dispose()
window.history.replaceState({}, '', originalUrl)
routerHost.remove()

// A form submit can unmount its component before an async operation finishes.
const formHost = createHost('form-unmount')
const form = createForm({ email: '' }, {
  email: value => value.includes('@') ? undefined : 'Email is required'
})
let releaseSubmission
const submissionGate = new Promise(resolve => {
  releaseSubmission = resolve
})
let submitFinished
let resolveSubmitFinished
const submitFinishedPromise = new Promise(resolve => {
  resolveSubmitFinished = resolve
})
let formMounted = true
const submittedAfterUnmount = signal(false)
let formApp
const submitAndUnmount = async event => {
  event.preventDefault()
  if (Object.keys(form.validate()).length > 0) {
    return
  }

  formApp.unmount()
  formMounted = false
  await submissionGate
  if (formMounted) {
    submittedAfterUnmount.value = true
  }
  submitFinished = true
  resolveSubmitFinished()
}
formApp = mount(() => html`
  <form data-edge-form @submit.prevent=${submitAndUnmount}>
    <input data-edge-email use:bind=${form.fields.email}>
    <button data-edge-submit type="submit">Send</button>
  </form>
`, formHost)
setInputValue(formHost.querySelector('[data-edge-email]'), 'grog@example.com')
formHost.querySelector('[data-edge-submit]').click()
assert(formHost.childNodes.length === 0, 'Form submission must tolerate synchronous component unmount')
releaseSubmission()
await submitFinishedPromise
assert(submitFinished && !submittedAfterUnmount.value, 'Async form completion must not update an unmounted view')
submittedAfterUnmount.dispose()
formHost.remove()

// Styles must be injected once, survive detached mounts, and be re-injectable after disposal.
const styleHost = createHost('style-timing')
const detachedContainer = document.createDocumentFragment()
const edgeStyle = css`.edge-timing { color: purple }`
assert(!disposeStyle(edgeStyle), 'Disposing a style before injection must be harmless')
const detachedApp = mount(() => html`<div class="edge-timing" data-detached-style use:style=${edgeStyle}>detached</div>`, detachedContainer)
assert(document.querySelector(`style[data-matrix-style="${edgeStyle.id}"]`), 'Detached mount must inject its style into the document')
const attachedApp = mount(() => html`<div class="edge-timing" data-attached-style use:style=${edgeStyle}>attached</div>`, styleHost)
assert(document.querySelectorAll(`style[data-matrix-style="${edgeStyle.id}"]`).length === 1, 'Shared style must be injected only once')
assert(disposeStyle(edgeStyle), 'Injected style must be disposable while views are mounted')
assert(!document.querySelector(`style[data-matrix-style="${edgeStyle.id}"]`), 'Disposed style must leave the document')
const reinjectedApp = mount(() => html`<div class="edge-timing" data-reinjected-style use:style=${edgeStyle}>again</div>`, styleHost)
assert(document.querySelector(`style[data-matrix-style="${edgeStyle.id}"]`), 'A disposed style must be injected again on a later mount')
detachedApp.unmount()
attachedApp.unmount()
reinjectedApp.unmount()
assert(disposeStyle(edgeStyle), 'Final style disposal must clean the reinjected stylesheet')
styleHost.remove()

// Very long dynamic text must render and update without truncation.
const longTextHost = createHost('long-text')
const firstLongText = '🦴'.repeat(50000)
const secondLongText = 'matrix-'.repeat(25000)
const longText = signal(firstLongText)
const longTextApp = mount(() => html`<p data-long-text>${longText}</p>`, longTextHost)
assert(longTextHost.querySelector('[data-long-text]').textContent === firstLongText, 'Very long text must render completely')
longText.value = secondLongText
assert(longTextHost.querySelector('[data-long-text]').textContent === secondLongText, 'Very long text must update completely')
longTextApp.unmount()
longText.dispose()
longTextHost.remove()

// Repeatedly mounting the same component must leave no active effects or DOM.
const rapidHost = createHost('rapid-mount')
const effectsBeforeRapidMounts = inspectEffects().length
let rapidMounts = 0
let rapidUnmounts = 0
function RapidComponent() {
  const local = signal(0)
  onMount(() => { rapidMounts += 1 })
  onUnmount(() => { rapidUnmounts += 1 })
  return html`<span data-rapid>${local}</span>`
}
for (let index = 0; index < 500; index += 1) {
  const rapidApp = mount(RapidComponent, rapidHost)
  rapidApp.unmount()
}
await wait(0)
assert(rapidMounts === 500 && rapidUnmounts === 500, 'Rapid mounts must run matching lifecycle callbacks')
assert(inspectEffects().length === effectsBeforeRapidMounts, 'Rapid mounts must not leak effects')
assert(rapidHost.childNodes.length === 0, 'Rapid mounts must not leave DOM nodes')
rapidHost.remove()

document.body.dataset.matrixEdgeCaseTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
