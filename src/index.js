const runtimeKey = Symbol.for('@mickyballadelli/matrix.runtime')
const previousRuntime = globalThis[runtimeKey]
if (typeof previousRuntime === 'string' && previousRuntime !== import.meta.url) {
  console.warn('Multiple @mickyballadelli/matrix runtimes are loaded. Keep a single instance.')
}
globalThis[runtimeKey] = import.meta.url

export {
  batch,
  computed,
  createScope,
  disposeScope,
  effect,
  flushJobs,
  onCleanup,
  signal
} from './reactivity/index.js'

export {
  component,
  errorBoundary,
  inject,
  onMount,
  onUnmount,
  provide
} from './components/index.js'
export { delegate, html, keyed, mount, render } from './dom/index.js'
export { Fragment, createElement, h, jsx, jsxDEV, jsxs } from './jsx-runtime.js'
export { css, cssVariables, defaultTokens, disposeStyle, globalCss, theme, tokens, utilityCss } from './styles/index.js'
export { usePlugin } from './plugins.js'
export {
  bindInput,
  createForm,
  createRouter,
  createLogger,
  inspect,
  inspectEffects,
  resource,
  routerView,
  setDevtoolsHook,
  watchDebug
} from './utils/index.js'
