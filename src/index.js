const runtimeKey = Symbol.for('@mickyballadelli/matrix.runtime')
const previousRuntime = globalThis[runtimeKey]
const runtimeInfo = Object.freeze({
  url: import.meta.url,
  loadedAt: new Date().toISOString()
})
const previousInfo = typeof previousRuntime === 'string'
  ? { url: previousRuntime, loadedAt: 'unknown' }
  : previousRuntime

if (previousInfo?.url && previousInfo.url !== import.meta.url) {
  console.warn(
    `[Matrix] Multiple @mickyballadelli/matrix runtimes are loaded. First: ${previousInfo.url} (${previousInfo.loadedAt}); current: ${runtimeInfo.url} (${runtimeInfo.loadedAt}). Keep one runtime copy so signals and plugins share the same graph.`,
    { firstRuntime: previousInfo, currentRuntime: runtimeInfo }
  )
}
globalThis[runtimeKey] = runtimeInfo

export { configure, getRuntimeConfig } from './config.js'

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
