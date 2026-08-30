import {
  component,
  computed,
  createForm,
  createRouter,
  cssVariables,
  html,
  jsx,
  mount,
  routerView,
  signal
} from '../src/index.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const setInputValue = (element, value) => {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

const root = document.createElement('div')
root.id = 'matrix-integration-root'
document.body.append(root)

// Complex form: conditional fields, validation, and asynchronous submission.
const registration = createForm({
  email: '',
  accountType: 'personal',
  company: ''
}, {
  email: value => value.includes('@') ? undefined : 'Email is required',
  company: (value, values) => values.accountType === 'business' && !value
    ? 'Company is required'
    : undefined
}, { name: 'registration' })
const registrationErrors = computed(() => Object.entries(registration.errors.value)
  .map(([field, message]) => html`<li data-form-error=${field}>${message}</li>`))
const showCompany = computed(() => registration.fields.accountType.value === 'business'
  ? html`<label data-form-company-label>Company <input data-form-company use:bind=${registration.fields.company}></label>`
  : null)
const saving = signal(false)
const savingLabel = computed(() => saving.value ? 'Saving' : 'Save')
const submittedEmail = signal('')
let resolveSubmission
const submissionFinished = new Promise(resolve => {
  resolveSubmission = resolve
})

const submitRegistration = async event => {
  event.preventDefault()
  const errors = registration.validate()
  if (Object.keys(errors).length > 0) {
    return
  }

  saving.value = true
  const values = registration.values.value
  await wait(5)
  submittedEmail.value = values.email
  saving.value = false
  resolveSubmission(values)
}

const formApp = mount(() => html`
  <form data-registration @submit.prevent=${submitRegistration} novalidate>
    <label>Email <input data-form-email type="email" use:bind=${registration.fields.email}></label>
    <label>Account type
      <select data-form-account use:bind=${registration.fields.accountType}>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>
    </label>
    ${showCompany}
    <ul data-form-errors>${registrationErrors}</ul>
    <button data-form-submit type="submit">${savingLabel}</button>
    <output data-form-result>${submittedEmail}</output>
  </form>
`, root)

assert(!root.querySelector('[data-form-company]'), 'Conditional company field must start hidden')
root.querySelector('[data-form-submit]').click()
assert(registration.errors.value.email === 'Email is required', 'Invalid form submission must validate email')
assert(root.querySelector('[data-form-error="email"]')?.textContent === 'Email is required', 'Validation errors must render')

const accountSelect = root.querySelector('[data-form-account]')
accountSelect.value = 'business'
accountSelect.dispatchEvent(new Event('change', { bubbles: true }))
assert(root.querySelector('[data-form-company]'), 'Business account must reveal the conditional field')

setInputValue(root.querySelector('[data-form-email]'), 'grog@example.com')
root.querySelector('[data-form-submit]').click()
assert(registration.errors.value.company === 'Company is required', 'Conditional validation must require the visible field')

setInputValue(root.querySelector('[data-form-company]'), 'Grog Inc')
root.querySelector('[data-form-submit]').click()
assert(saving.value, 'Valid submission must enter the saving state before awaiting')
const submittedValues = await submissionFinished
assert(submittedValues.email === 'grog@example.com' && submittedValues.company === 'Grog Inc', 'Async submission must receive current form values')
assert(root.querySelector('[data-form-result]').textContent === 'grog@example.com', 'Async submission result must render')

accountSelect.value = 'personal'
accountSelect.dispatchEvent(new Event('change', { bubbles: true }))
assert(!root.querySelector('[data-form-company]'), 'Conditional field must be removed when no longer needed')
formApp.unmount()

// Router: guarded pages, transition wrapper, parameters, and redirects.
const originalUrl = window.location.href
const authenticated = signal(false)
const transitionLog = []
const router = createRouter([
  { path: '/', view: () => html`<h1 data-page="home">Home</h1>` },
  { path: '/admin', view: () => html`<h1 data-page="admin">Admin</h1>` },
  { path: '/legacy', redirect: '/dashboard' },
  { path: '/dashboard', view: () => html`<h1 data-page="dashboard">Dashboard</h1>` },
  { path: '/users/:id', view: ({ id }) => html`<h1 data-page="user">User ${id}</h1>` }
], {
  beforeEach: async ({ to }) => {
    await wait(1)
    return to?.path !== '/admin' || authenticated.value
  },
  afterEach: ({ to }) => {
    transitionLog.push(to?.path ?? 'unknown')
  }
})
const activeRoute = routerView(router, () => html`<p data-page="fallback">Not found</p>`)
const routerApp = mount(() => html`<main data-router-root>${activeRoute}</main>`, root)
router.start()
assert(await router.navigate('/'), 'Router must enter its home page')
assert(root.querySelector('[data-page="home"]'), 'Home route must render')
assert(await router.navigate('/admin') === false, 'Route guard must block unauthenticated access')
assert(router.path.value === '/', 'Blocked navigation must keep the current path')

const transitionApi = {
  startViewTransition(update) {
    transitionLog.push('transition:start')
    const finished = Promise.resolve().then(async () => {
      const result = await update()
      transitionLog.push('transition:finish')
      return result
    })
    return { finished }
  }
}

const navigateWithTransition = async path => {
  let result
  const transition = transitionApi.startViewTransition(async () => {
    result = await router.navigate(path)
  })
  await transition.finished
  return result
}

authenticated.value = true
assert(await navigateWithTransition('/admin'), 'Authenticated navigation must pass the guard')
assert(root.querySelector('[data-page="admin"]'), 'Admin route must render after the guard passes')
assert(transitionLog.includes('transition:start') && transitionLog.includes('transition:finish'), 'Navigation must work inside a transition')
assert(await navigateWithTransition('/legacy'), 'Redirect navigation must resolve successfully')
assert(router.path.value === '/dashboard', 'Legacy route must redirect to the dashboard')
assert(root.querySelector('[data-page="dashboard"]'), 'Redirect destination must render')
assert(await router.navigate('/users/42'), 'Parameterized route must navigate')
assert(root.querySelector('[data-page="user"]').textContent === 'User 42', 'Parameterized route props must render')
assert(transitionLog.includes('/admin') && transitionLog.includes('/dashboard'), 'Router afterEach must observe navigations and redirects')
router.dispose()
routerApp.unmount()
window.history.replaceState({}, '', originalUrl)

// Dynamic theme: CSS variables update through a computed value.
const themeMode = signal('light')
const themeVariables = cssVariables({
  '--integration-surface': computed(() => themeMode.value === 'light' ? '#fff' : '#111'),
  '--integration-text': computed(() => themeMode.value === 'light' ? '#111' : '#fff')
})
const themeApp = mount(() => html`<section data-theme use:vars=${themeVariables}>Theme</section>`, root)
const themeNode = root.querySelector('[data-theme]')
assert(themeNode.style.getPropertyValue('--integration-surface') === '#fff', 'Light theme variable must be applied')
themeMode.value = 'dark'
assert(themeNode.style.getPropertyValue('--integration-surface') === '#111', 'Dark theme surface variable must update')
assert(getComputedStyle(themeNode).getPropertyValue('--integration-text').trim() === '#fff', 'Dark theme text variable must reach computed styles')
themeApp.unmount()

// Deep component composition: nested objects and arrays survive every component boundary.
const makePacket = (name, tags) => ({
  user: { name, profile: { title: 'Explorer' } },
  metadata: { tags, flags: { active: true } }
})

function InnerPacket(props) {
  return html`<article data-deep-packet>
    <strong data-deep-name>${props.packet.user.name}</strong>
    <span data-deep-title>${props.packet.user.profile.title}</span>
    <span data-deep-tags>${props.packet.metadata.tags.join('|')}</span>
    <span data-deep-active>${String(props.packet.metadata.flags.active)}</span>
  </article>`
}

function MiddlePacket(props) {
  return html`<section data-middle-packet>${component(InnerPacket, { packet: props.packet })}</section>`
}

function OuterPacket(props) {
  return html`<div data-outer-packet>${component(MiddlePacket, { packet: props.packet })}</div>`
}

const packet = signal(component(OuterPacket, { packet: makePacket('Ada', ['one', 'two']) }))
const packetApp = mount(() => html`${packet}`, root)
assert(root.querySelector('[data-deep-name]').textContent === 'Ada', 'Outer component must pass nested props to the inner component')
assert(root.querySelector('[data-deep-tags]').textContent === 'one|two', 'Deep array props must reach the inner component')
packet.value = component(OuterPacket, { packet: makePacket('Boudica', ['three', 'four']) })
assert(root.querySelector('[data-deep-name]').textContent === 'Boudica', 'Nested composition must update when the component result changes')
assert(root.querySelector('[data-deep-active]').textContent === 'true', 'Deep object props must remain intact')
packetApp.unmount()

// Mixed JSX and template literal syntax.
const mixedTitle = signal('JSX title')
const mixedClicks = signal(0)
const MixedChild = props => html`<span data-mixed-child>${props.label}</span>`
const mixedApp = mount(() => html`
  <section data-mixed>
    ${jsx('h2', { className: 'mixed-heading', children: mixedTitle })}
    ${jsx(MixedChild, { label: 'template child' })}
    ${jsx('button', { className: 'mixed-jsx-button', onClick: () => mixedClicks.update(value => value + 1), children: 'JSX button' })}
    ${html`<button class="mixed-template-button" @click=${() => mixedClicks.update(value => value + 1)}>Template button</button>`}
    <output data-mixed-count>${mixedClicks}</output>
  </section>
`, root)
assert(root.querySelector('.mixed-heading').textContent === 'JSX title', 'JSX nodes must render inside template literals')
assert(root.querySelector('[data-mixed-child]').textContent === 'template child', 'Template components must render inside JSX nodes')
root.querySelector('.mixed-jsx-button').click()
root.querySelector('.mixed-template-button').click()
assert(root.querySelector('[data-mixed-count]').textContent === '2', 'JSX and template event handlers must share reactive state')
mixedTitle.value = 'Updated JSX title'
assert(root.querySelector('.mixed-heading').textContent === 'Updated JSX title', 'Reactive JSX children must update')
mixedApp.unmount()

// SVG: nested SVG, xlink attributes, dynamic values, and foreignObject namespaces.
const iconReference = signal('#icon-path')
const iconStroke = signal('tomato')
const iconRadius = signal(4)
const svgApp = mount(() => html`
  <svg data-integration-svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <defs><path id="icon-path" d="M1 1h18v18H1z"></path></defs>
    <use data-integration-use xlink:href=${iconReference} stroke=${iconStroke}></use>
    <circle data-integration-circle cx="10" cy="10" r=${iconRadius}></circle>
    <foreignObject data-integration-foreign><div data-integration-html>HTML in SVG</div></foreignObject>
  </svg>
`, root)
const svg = root.querySelector('[data-integration-svg]')
const useNode = root.querySelector('[data-integration-use]')
const circle = root.querySelector('[data-integration-circle]')
const foreignContent = root.querySelector('[data-integration-html]')
assert(svg.namespaceURI === 'http://www.w3.org/2000/svg', 'SVG root must use the SVG namespace')
assert(useNode.namespaceURI === 'http://www.w3.org/2000/svg' && circle.namespaceURI === 'http://www.w3.org/2000/svg', 'Nested SVG elements must keep the SVG namespace')
assert(useNode.getAttribute('xlink:href') === '#icon-path', 'SVG xlink attributes must render')
assert(foreignContent.namespaceURI === 'http://www.w3.org/1999/xhtml', 'foreignObject children must return to the HTML namespace')
iconReference.value = '#other-path'
iconStroke.value = 'blue'
iconRadius.value = 8
assert(useNode.getAttribute('xlink:href') === '#other-path' && useNode.getAttribute('stroke') === 'blue', 'Dynamic SVG attributes must update')
assert(circle.getAttribute('r') === '8', 'Dynamic SVG geometry must update')
svgApp.unmount()

// Touch gestures: a complete swipe must cross the configured distance threshold.
const gestureState = signal('idle')
let gestureStartX = 0
const touchPoint = event => event.changedTouches?.[0] ?? event.touches?.[0]
const gestureApp = mount(() => html`
  <button data-gesture
    @touchstart=${event => {
      gestureStartX = touchPoint(event).clientX
      gestureState.value = 'started'
    }}
    @touchmove=${() => { gestureState.value = 'moving' }}
    @touchend=${event => {
      const endX = touchPoint(event).clientX
      gestureState.value = gestureStartX - endX > 40 ? 'swipe-left' : 'tap'
    }}>${gestureState}</button>
`, root)

const createTouchEvent = (type, x) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const point = { clientX: x, clientY: 10 }
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [point] })
  Object.defineProperty(event, 'changedTouches', { value: [point] })
  return event
}

const gestureButton = root.querySelector('[data-gesture]')
gestureButton.dispatchEvent(createTouchEvent('touchstart', 120))
gestureButton.dispatchEvent(createTouchEvent('touchmove', 90))
assert(gestureState.value === 'moving', 'Touch move must reach the gesture handler')
gestureButton.dispatchEvent(createTouchEvent('touchend', 30))
assert(gestureState.value === 'swipe-left', 'Touch end must detect a left swipe')
gestureApp.unmount()

// Keyboard navigation: focusable fields, Enter submission, and Enter route navigation.
const keyboardForm = createForm({ query: '' }, {
  query: value => value.trim() ? undefined : 'Query is required'
})
const keyboardError = computed(() => keyboardForm.errors.value.query ?? '')
const keyboardSubmitted = signal(false)
const keyboardRouter = createRouter([
  { path: '/keyboard-home', view: () => html`<p data-keyboard-page="home">Keyboard home</p>` },
  { path: '/keyboard-next', view: () => html`<p data-keyboard-page="next">Keyboard next</p>` }
])
const keyboardView = routerView(keyboardRouter)
const submitKeyboard = () => {
  if (Object.keys(keyboardForm.validate()).length === 0) {
    keyboardSubmitted.value = true
  }
}
let tabEvents = 0
const keyboardApp = mount(() => html`
  <main data-keyboard-root>
    <a data-keyboard-link href="/keyboard-next" @keydown=${event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        keyboardRouter.navigate('/keyboard-next')
      }
    }}>Next page</a>
    <form data-keyboard-form @submit.prevent=${submitKeyboard}>
      <input data-keyboard-query use:bind=${keyboardForm.fields.query} @keydown=${event => {
        if (event.key === 'Tab') tabEvents += 1
        if (event.key === 'Enter') {
          event.preventDefault()
          submitKeyboard()
        }
      }}>
      <button data-keyboard-submit type="submit">Search</button>
      <output data-keyboard-error>${keyboardError}</output>
      <output data-keyboard-result>${keyboardSubmitted}</output>
    </form>
    ${keyboardView}
  </main>
`, root)
keyboardRouter.start()
assert(await keyboardRouter.navigate('/keyboard-home'), 'Keyboard router must enter its initial page')

const queryInput = root.querySelector('[data-keyboard-query]')
queryInput.focus()
queryInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
assert(tabEvents === 1 && document.activeElement === queryInput, 'Form fields must receive keyboard focus events')
queryInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
assert(root.querySelector('[data-keyboard-error]').textContent === 'Query is required', 'Enter on an invalid field must show validation')
setInputValue(queryInput, 'matrix')
queryInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
assert(keyboardSubmitted.value, 'Enter on a valid form field must submit the form')

const keyboardLink = root.querySelector('[data-keyboard-link]')
keyboardLink.focus()
keyboardLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
await wait(0)
assert(keyboardRouter.path.value === '/keyboard-next', 'Enter on a router link must navigate')
assert(root.querySelector('[data-keyboard-page="next"]'), 'Keyboard navigation must render the destination page')
assert(document.activeElement === keyboardLink, 'Router link must remain the focused keyboard target')
keyboardRouter.dispose()
keyboardApp.unmount()

document.body.dataset.matrixIntegrationTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
