import {
  component,
  computed,
  css,
  cssVariables,
  createForm,
  createRouter,
  disposeStyle,
  errorBoundary,
  html,
  jsx,
  keyed,
  globalCss,
  mount,
  onMount,
  onUnmount,
  resource,
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
  return html`<span class="child">enfant</span>`
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

assert(button.textContent === '0', 'Le texte initial doit être rendu')
assert(host.querySelector('output').textContent === '0', 'Le computed doit être rendu')
assert(mounted, 'onMount doit être appelé')

const escaped = signal('<strong>unsafe</strong>')
const escapeApp = mount(() => html`<p>${escaped}</p>`, host)
assert(!escapeApp.nodes.some(node => node.querySelector?.('strong')), 'Le texte dynamique doit être échappé')
assert(escapeApp.nodes.find(node => node.nodeName === 'P').textContent === '<strong>unsafe</strong>', 'Le texte échappé doit rester lisible')
escapeApp.unmount()

const svg = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg')
assert(svg.namespaceURI === 'http://www.w3.org/2000/svg', 'Le document doit supporter SVG')

button.click()
assert(button.textContent === '1', 'Le texte doit suivre le signal')
assert(input.value === '1', 'Le binding input doit suivre le signal')

input.value = '3'
input.dispatchEvent(new Event('input', { bubbles: true }))
assert(count.value === '3', 'Le binding input doit écrire dans le signal')

accent.value = 'blue'
assert(host.querySelector('[data-matrix-scope]'), 'Scoped style must add a scope')
assert(host.querySelector('style[data-matrix-style]'), 'Style must be injected')
assert(host.querySelector('.box').style.getPropertyValue('--accent') === 'blue', 'La variable CSS doit être réactive')

app.unmount()
assert(unmounted, 'onUnmount doit être appelé')
assert(host.childNodes.length === 0, 'Le démontage doit retirer le DOM')

const Counter = () => {
  const local = signal(0)
  return html`<button @click=${() => local.update(value => value + 1)}>${local}</button>`
}

const isolatedApp = mount(() => html`${component(Counter)}${component(Counter)}`, host)
const counters = host.querySelectorAll('button')
counters[0].click()
assert(counters[0].textContent === '1' && counters[1].textContent === '0', 'Chaque composant doit isoler son état')
isolatedApp.unmount()

const bad = () => {
  throw new Error('boom')
}
const boundaryApp = mount(() => html`
  ${errorBoundary(() => component(bad), error => html`<strong>${error.message}</strong>`)}
`, host)
assert(host.querySelector('strong').textContent.includes('boom'), 'La frontière doit rendre le fallback')
boundaryApp.unmount()

let namedError
try {
  mount(() => component(bad), host)
} catch (error) {
  namedError = error
}
assert(namedError?.message.includes('[bad]'), 'Les erreurs doivent inclure le composant')

let templateError
try {
  html('<p>')
} catch (error) {
  templateError = error
}
assert(templateError, 'Un template mal appelé doit produire une erreur claire')

let callbackValue = ''
const PropChild = props => html`<button @click=${() => props.onChange(props.label)}>${props.label}</button>`
const propsApp = mount(() => component(PropChild, {
  label: 'child',
  onChange(value) {
    callbackValue = value
  }
}), host)
host.querySelector('button').click()
assert(callbackValue === 'child', 'Les callbacks enfant-parent doivent fonctionner')
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
assert(reorderedButtons[1].textContent === '1', 'Une clé stable doit conserver l’état déplacé')
keyedItems.value = [stableCounter('new'), keyedItems.value[0]]
assert(host.querySelectorAll('button')[0].textContent === '0', 'Une nouvelle clé doit créer un nouvel état')
keyedApp.unmount()

function StatefulProps(props) {
  const local = signal(0)
  return html`<button data-prop-id=${props.id} @click=${() => local.update(value => value + 1)}>${props.label}:${local}</button>`
}

const propItems = signal([component(StatefulProps, { id: 'same', label: 'avant' })])
const propApp = mount(() => html`${keyed(propItems, item => item.props.id)}`, host)
host.querySelector('button').click()
propItems.value = [component(StatefulProps, { id: 'same', label: 'après' })]
assert(host.querySelector('button').textContent === 'après:1', 'Une prop mise à jour doit garder l’état local')
propApp.unmount()

const composed = signal('')
const formApp = mount(() => html`<input use:bind=${composed}>`, host)
const formInput = host.querySelector('input')
formInput.dispatchEvent(new CompositionEvent('compositionstart'))
formInput.value = 'é'
formInput.dispatchEvent(new Event('input'))
assert(composed.value === '', 'La composition IME ne doit pas écrire trop tôt')
formInput.dispatchEvent(new CompositionEvent('compositionend'))
assert(composed.value === 'é', 'La composition IME doit écrire à la fin')
formApp.unmount()

let touched = 0
const touchApp = mount(() => html`<button @touchstart=${() => touched += 1}>touch</button>`, host)
host.querySelector('button').dispatchEvent(new Event('touchstart', { bubbles: true }))
assert(touched === 1, 'Les événements tactiles doivent fonctionner')
touchApp.unmount()

let pressed = ''
const keyboardApp = mount(() => html`<input @keydown=${event => pressed = event.key}>`, host)
host.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
assert(pressed === 'Enter', 'Les événements clavier doivent fonctionner')
keyboardApp.unmount()

const repeatedView = () => html`<i>repeat</i>`
const firstMount = mount(repeatedView, host)
const secondMount = mount(repeatedView, host)
assert(host.querySelectorAll('i').length === 2, 'Une vue doit pouvoir être montée plusieurs fois')
firstMount.unmount()
secondMount.unmount()

const replacement = signal(html`<p>before</p>`)
const replacementApp = mount(() => html`${replacement}`, host)
replacement.value = html`<p>after</p>`
assert(host.querySelector('p').textContent === 'after', 'Une vue dynamique doit pouvoir être remplacée')
replacementApp.unmount()

const longText = 'x'.repeat(100000)
const longValue = signal(longText)
const longApp = mount(() => html`<p>${longValue}</p>`, host)
assert(host.querySelector('p').textContent.length === longText.length, 'Les textes longs doivent être rendus')
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
assert(pseudoCss.includes(':hover') && pseudoCss.includes('::before'), 'Les pseudo-classes et pseudo-elements doivent rester dans le CSS')
pseudoApp.unmount()

const themeMode = signal('light')
const surface = computed(() => themeMode.value === 'light' ? '#fff' : '#111')
const themeApp = mount(() => html`<div use:vars=${cssVariables({ '--surface': surface })}>theme</div>`, host)
const themeNode = host.querySelector('[style]')
assert(themeNode.style.getPropertyValue('--surface') === '#fff', 'Le thème initial doit être appliqué')
themeMode.value = 'dark'
assert(themeNode.style.getPropertyValue('--surface') === '#111', 'Le changement de thème doit être réactif')
themeApp.unmount()

const nullable = signal(null)
const valuesApp = mount(() => html`<div use:vars=${cssVariables({ '--nullable': nullable, '--empty': '' })}>values</div>`, host)
const valuesNode = host.querySelector('[style]')
assert(valuesNode.style.getPropertyValue('--nullable') === '', 'Une variable null doit être retirée')
nullable.value = 'ok'
assert(valuesNode.style.getPropertyValue('--nullable') === 'ok', 'Une variable vide doit pouvoir devenir valide')
nullable.value = false
assert(valuesNode.style.getPropertyValue('--nullable') === '', 'Une variable false doit être retirée')
valuesApp.unmount()

let invalidVariables
try {
  cssVariables(null)
} catch (error) {
  invalidVariables = error
}
assert(invalidVariables instanceof TypeError, 'Les variables CSS invalides doivent produire une erreur')

const disposableStyle = css`.temporary { color: purple }`
const disposableApp = mount(() => html`<div use:style=${disposableStyle} class="temporary">temp</div>`, host)
assert(document.querySelector(`style[data-matrix-style="${disposableStyle.id}"]`), 'Temporary style must be present')
assert(disposeStyle(disposableStyle), 'disposeStyle doit retirer une feuille injectée')
assert(!document.querySelector(`style[data-matrix-style="${disposableStyle.id}"]`), 'Removed stylesheet must leave the document')
disposableApp.unmount()

const form = createForm({ email: '' }, {
  email: value => value.includes('@') ? undefined : 'email invalide'
})
assert(!form.valid.value, 'Un formulaire invalide doit exposer valid=false')
form.fields.email.value = 'grog@example.com'
assert(Object.keys(form.validate()).length === 0 && form.valid.value, 'La validation doit suivre les signals')

const originalPath = window.location.pathname
const router = createRouter([
  { path: '/', view: () => html`<p>home</p>` },
  { path: '/matrix-user/:id', view: () => html`<p>user</p>` }
])
router.start()
assert(await router.navigate('/matrix-user/7?tab=profile#details'), 'Le routeur doit naviguer')
assert(router.current.value.params.id === '7', 'Le routeur doit extraire les paramètres')
assert(router.search.value === '?tab=profile' && router.hash.value === '#details', 'Router must preserve search and hash')
await router.navigate('/')
await router.navigate('/matrix-user/7')
const backNavigation = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }))
window.history.back()
await backNavigation
assert(router.path.value === '/', 'Le routeur doit suivre le bouton retour')
router.stop()
window.history.replaceState({}, '', originalPath)

const asyncResource = resource(async value => value * 2)
await asyncResource.reload(4)
assert(asyncResource.status.value === 'success' && asyncResource.data.value === 8, 'La ressource doit exposer son résultat')
const failedResource = resource(async () => {
  throw new Error('failure')
})
await failedResource.reload().catch(() => {})
assert(failedResource.status.value === 'error' && failedResource.error.value instanceof Error, 'La ressource doit exposer les erreurs')

const pluginEvents = []
const pluginText = signal('plugin')
const stopPlugin = usePlugin({
  install(api) {
    return api.on('renderer', event => pluginEvents.push(event.type))
  }
})
const pluginApp = mount(() => html`<span>${pluginText}</span>`, host)
assert(pluginEvents.includes('dom:update'), 'Un plugin doit pouvoir observer le renderer')
pluginApp.unmount()
stopPlugin()

const disposedSignal = signal('alive')
const disposedApp = mount(() => html`<span>${disposedSignal}</span>`, host)
disposedApp.unmount()
disposedSignal.value = 'gone'
assert(host.textContent === '', 'Aucun effet DOM ne doit survivre au démontage')

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

document.body.dataset.matrixTests = 'passed'
window.__MATRIX_TEST_RESULT__ = 'passed'
