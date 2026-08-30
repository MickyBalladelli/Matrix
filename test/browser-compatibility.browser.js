import { computed, css, disposeStyle, effect, html, mount, signal } from '../src/index.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const requiredFeatures = [
  ['WeakMap', typeof WeakMap === 'function'],
  ['Map', typeof Map === 'function'],
  ['Proxy', typeof Proxy === 'function'],
  ['URL', typeof URL === 'function'],
  ['HTMLTemplateElement', typeof HTMLTemplateElement === 'function'],
  ['matchMedia', typeof window.matchMedia === 'function']
]
for (const [name, supported] of requiredFeatures) {
  assert(supported, `Browser compatibility feature missing: ${name}`)
}

const host = document.createElement('div')
host.dataset.browserCompatibility = 'runtime'
document.body.append(host)

const source = signal(1)
const doubled = computed(() => source.value * 2)
let effectRuns = 0
const stop = effect(() => {
  doubled.value
  effectRuns += 1
})
const app = mount(() => html`<output data-runtime-value>${doubled}</output>`, host)
assert(host.querySelector('[data-runtime-value]').textContent === '2', 'Reactive DOM must render in the compatibility browser')
source.value = 3
assert(host.querySelector('[data-runtime-value]').textContent === '6', 'Reactive DOM must update in the compatibility browser')
assert(effectRuns === 2, 'Effects must run in the compatibility browser')
app.unmount()
stop()
doubled.dispose()
source.dispose()

const touchSource = signal(0)
const touchApp = mount(() => html`<button data-touch-target @touchstart=${() => touchSource.update(value => value + 1)}>Touch</button>`, host)
const touchTarget = host.querySelector('[data-touch-target]')
touchTarget.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }))
assert(touchSource.value === 1, 'Touch events must reach Matrix handlers')
touchApp.unmount()
touchSource.dispose()

const darkStyle = css`
  @media (prefers-color-scheme: dark) {
    .compatibility-dark { color: rgb(255, 255, 255); }
  }
`
const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
assert(typeof darkMode.matches === 'boolean', 'Dark mode media query must expose a boolean match state')
const darkApp = mount(() => html`<p class="compatibility-dark" data-dark-probe use:style=${darkStyle}>Theme</p>`, host)
assert(document.querySelector(`style[data-matrix-style="${darkStyle.id}"]`), 'Dark mode CSS must be injected')
if (darkMode.matches) {
  assert(getComputedStyle(host.querySelector('[data-dark-probe]')).color === 'rgb(255, 255, 255)', 'Dark mode CSS must apply when dark mode is active')
}
darkApp.unmount()
disposeStyle(darkStyle)

const rtlHost = document.createElement('div')
rtlHost.dir = 'rtl'
document.body.append(rtlHost)
const rtlApp = mount(() => html`<p data-rtl-probe>مرحبا Matrix</p>`, rtlHost)
assert(getComputedStyle(rtlHost).direction === 'rtl', 'RTL direction must be preserved')
assert(rtlHost.querySelector('[data-rtl-probe]').textContent.includes('Matrix'), 'RTL content must render')
rtlApp.unmount()
rtlHost.remove()

host.remove()
document.body.dataset.matrixBrowserCompatibility = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
