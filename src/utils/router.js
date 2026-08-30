import { computed, signal } from '../reactivity/index.js'
import { component } from '../components/index.js'
import { onCleanup } from '../reactivity/scope.js'
import { getCurrentRenderState, runWithRenderState } from '../reactivity/context.js'
import { isDevelopment } from '../config.js'
import { warnDevelopment } from './development.js'

let nextRouterId = 1
const activeRouters = new Set()

function normalizePath(path) {
  const value = String(path || '/')
  const withoutHash = value.split('#')[0]
  const withoutQuery = withoutHash.split('?')[0]
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : '/'
}

function normalizeBase(base) {
  const value = String(base || '').replace(/^\/+|\/+$/g, '')
  return value ? `/${value}` : ''
}

function compileRoute(pattern) {
  const keys = []
  const source = normalizePath(pattern)
    .split('/')
    .map(segment => {
      if (segment.startsWith('*')) {
        keys.push(segment.slice(1) || 'splat')
        return '(.*)'
      }
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1))
        return '([^/]+)'
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')

  return {
    keys,
    expression: new RegExp(`^${source}$`)
  }
}

function createRouteIndex(routeRecords) {
  const staticRoutes = new Map()
  const dynamicRoutes = []

  for (const record of routeRecords) {
    const firstSegment = normalizePath(record.route.path).split('/')[1] || '/'
    if (firstSegment.startsWith(':') || firstSegment.startsWith('*')) {
      dynamicRoutes.push(record)
      continue
    }

    const bucket = staticRoutes.get(firstSegment) ?? []
    bucket.push(record)
    staticRoutes.set(firstSegment, bucket)
  }

  return { staticRoutes, dynamicRoutes }
}

function matchRoute(routeIndex, path) {
  const firstSegment = normalizePath(path).split('/')[1] || '/'
  const staticRoutes = routeIndex.staticRoutes.get(firstSegment) ?? []
  let staticIndex = 0
  let dynamicIndex = 0

  while (staticIndex < staticRoutes.length || dynamicIndex < routeIndex.dynamicRoutes.length) {
    const staticRoute = staticRoutes[staticIndex]
    const dynamicRoute = routeIndex.dynamicRoutes[dynamicIndex]
    const record = !dynamicRoute || (staticRoute && staticRoute.index < dynamicRoute.index)
      ? staticRoutes[staticIndex++]
      : routeIndex.dynamicRoutes[dynamicIndex++]
    const route = record.route
    const match = route.matcher.expression.exec(path)
    if (!match) {
      continue
    }

    const params = {}
    route.matcher.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1] || '')
    })

    return { ...route, params }
  }

  return null
}

function validateRoutes(routeDefinitions) {
  const seenPaths = new Map()

  for (let index = 0; index < routeDefinitions.length; index += 1) {
    const route = routeDefinitions[index]
    if (!route || typeof route !== 'object') {
      throw new TypeError(`createRouter() route ${index} must be an object with a path`)
    }

    if (typeof route.path !== 'string' || route.path.trim() === '') {
      throw new TypeError(`createRouter() route ${index} must define a non-empty path`)
    }

    const normalizedPath = normalizePath(route.path)
    if (!route.path.startsWith('/')) {
      warnDevelopment(
        `Router route "${route.path}" does not start with "/" and may never match browser paths.`,
        { type: 'router:misconfiguration', issue: 'relative-path', index, path: route.path }
      )
    }

    if (seenPaths.has(normalizedPath)) {
      warnDevelopment(
        `Router defines "${normalizedPath}" more than once. The first matching route wins.`,
        { type: 'router:misconfiguration', issue: 'duplicate-path', index, path: normalizedPath, firstIndex: seenPaths.get(normalizedPath) }
      )
    } else {
      seenPaths.set(normalizedPath, index)
    }

    const hasView = typeof route.view === 'function'
    const hasRedirect = route.redirect !== undefined
    if (route.view !== undefined && !hasView) {
      warnDevelopment(
        `Router view for "${normalizedPath}" is not a function and was ignored.`,
        { type: 'router:misconfiguration', issue: 'invalid-view', index, path: normalizedPath }
      )
    }

    if (hasRedirect && typeof route.redirect !== 'string' && typeof route.redirect !== 'function') {
      warnDevelopment(
        `Router redirect for "${normalizedPath}" must be a path string or function.`,
        { type: 'router:misconfiguration', issue: 'invalid-redirect', index, path: normalizedPath }
      )
    }

    if (!hasView && !hasRedirect) {
      warnDevelopment(
        `Router route "${normalizedPath}" has neither a view nor a redirect. It will render the router fallback.`,
        { type: 'router:misconfiguration', issue: 'missing-view', index, path: normalizedPath }
      )
    }

    if (hasView && hasRedirect) {
      warnDevelopment(
        `Router route "${normalizedPath}" has both a view and a redirect. The redirect takes precedence.`,
        { type: 'router:misconfiguration', issue: 'view-and-redirect', index, path: normalizedPath }
      )
    }

    const parameterNames = [...route.path.matchAll(/:([^/]+)/g)].map(match => match[1])
    if (new Set(parameterNames).size !== parameterNames.length) {
      warnDevelopment(
        `Router route "${normalizedPath}" repeats a parameter name. Use unique names for predictable route params.`,
        { type: 'router:misconfiguration', issue: 'duplicate-parameter', index, path: normalizedPath }
      )
    }

    const hasCatchAll = route.path.split('/').some(segment => segment.startsWith('*'))
    if (hasCatchAll && index < routeDefinitions.length - 1) {
      warnDevelopment(
        `Router catch-all route "${normalizedPath}" is not last. Later routes will be unreachable.`,
        { type: 'router:misconfiguration', issue: 'catch-all-order', index, path: normalizedPath }
      )
    }

    if (typeof route.redirect === 'string' && normalizePath(route.redirect) === normalizedPath) {
      warnDevelopment(
        `Router route "${normalizedPath}" redirects to itself and will hit the redirect limit.`,
        { type: 'router:misconfiguration', issue: 'self-redirect', index, path: normalizedPath }
      )
    }
  }
}

export function createRouter(routeDefinitions = [], options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('createRouter() must be used in a browser')
  }

  if (!Array.isArray(routeDefinitions)) {
    throw new TypeError('createRouter() expects an array of route definitions')
  }

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('createRouter() expects an options object')
  }

  const renderState = getCurrentRenderState()
  if (renderState?.isRendering) {
    const slot = renderState.stateCursor
    renderState.stateCursor += 1
    const existing = renderState.stateSlots[slot]

    if (existing) {
      if (existing.kind !== 'router') {
        throw new Error(`Component state order changed at slot ${slot}`)
      }
      return existing.value
    }

    const value = runWithRenderState(null, () => createRouterState(routeDefinitions, options))
    renderState.stateSlots[slot] = { kind: 'router', value }
    return value
  }

  return createRouterState(routeDefinitions, options)
}

function createRouterState(routeDefinitions, options) {
  validateRoutes(routeDefinitions)
  if (options.beforeEach !== undefined && typeof options.beforeEach !== 'function') {
    warnDevelopment('Router beforeEach must be a function and was ignored.', {
      type: 'router:misconfiguration',
      issue: 'invalid-before-each'
    })
  }

  if (options.afterEach !== undefined && typeof options.afterEach !== 'function') {
    warnDevelopment('Router afterEach must be a function and was ignored.', {
      type: 'router:misconfiguration',
      issue: 'invalid-after-each'
    })
  }

  if (options.base !== undefined && typeof options.base !== 'string') {
    warnDevelopment('Router base should be a string path such as "/admin".', {
      type: 'router:misconfiguration',
      issue: 'invalid-base'
    })
  }

  const routeRecords = routeDefinitions.map((route, index) => ({
    index,
    route: {
      ...route,
      matcher: compileRoute(route.path)
    }
  }))
  const routes = routeRecords.map(record => record.route)
  const routeIndex = createRouteIndex(routeRecords)
  const base = normalizeBase(options.base)
  const stripBase = pathname => (base && (pathname === base || pathname.startsWith(`${base}/`)))
    ? pathname.slice(base.length) || '/'
    : pathname
  const path = signal(normalizePath(stripBase(window.location.pathname)))
  const search = signal(window.location.search)
  const hash = signal(window.location.hash)
  const current = computed(() => matchRoute(routeIndex, path.value))
  let started = false
  let disposed = false
  let warnedUnstartedNavigation = false
  const warnedUnmatchedPaths = new Set()

  const onPopState = () => {
    path.value = normalizePath(stripBase(window.location.pathname))
    search.value = window.location.search
    hash.value = window.location.hash
  }

  function start() {
    if (disposed) {
      throw new Error('Cannot start a disposed router')
    }

    if (started) {
      warnDevelopment(
        'Router.start() was called more than once. The second call is ignored.',
        { type: 'router:misconfiguration', issue: 'duplicate-start' }
      )
      return stop
    }

    started = true
    window.addEventListener('popstate', onPopState)
    return stop
  }

  function stop() {
    if (!started) {
      return
    }

    started = false
    window.removeEventListener('popstate', onPopState)
  }

  function dispose() {
    if (disposed) {
      return
    }

    disposed = true
    stop()
    current.dispose?.()
    path.dispose?.()
    search.dispose?.()
    hash.dispose?.()
    activeRouters.delete(router)
  }

  async function navigate(nextPath, navigationOptions = {}) {
    if (disposed) {
      throw new Error('Cannot navigate a disposed router')
    }

    if (isDevelopment() && !started && !warnedUnstartedNavigation) {
      warnedUnstartedNavigation = true
      warnDevelopment(
        'Router.navigate() was called before router.start(). Browser back/forward changes will not be observed.',
        { type: 'router:misconfiguration', issue: 'navigate-before-start' }
      )
    }

    const redirectDepth = navigationOptions._redirectDepth ?? 0
    if (redirectDepth > 10) {
      throw new Error('Router redirect limit exceeded')
    }

    const url = new URL(String(nextPath || '/'), window.location.href)
    if (url.origin !== window.location.origin) {
      throw new Error('createRouter().navigate() only accepts same-origin URLs')
    }

    const normalizedPath = normalizePath(stripBase(url.pathname))
    const target = `${base}${normalizedPath}${url.search}${url.hash}`
    const destination = matchRoute(routeIndex, normalizedPath)

    if (isDevelopment() && !destination && !warnedUnmatchedPaths.has(normalizedPath)) {
      warnedUnmatchedPaths.add(normalizedPath)
      warnDevelopment(
        `No router route matches "${normalizedPath}". Add a route or provide a routerView fallback.`,
        { type: 'router:misconfiguration', issue: 'unmatched-path', path: normalizedPath }
      )
    }

    if (destination?.redirect) {
      const redirectTarget = typeof destination.redirect === 'function'
        ? destination.redirect({ route: destination, path: normalizedPath, search: url.search, hash: url.hash })
        : destination.redirect

      if (typeof redirectTarget !== 'string') {
        warnDevelopment(
          `Router redirect for "${normalizedPath}" did not return a path string.`,
          { type: 'router:misconfiguration', issue: 'invalid-redirect', path: normalizedPath }
        )
      }

      const redirectUrl = new URL(String(redirectTarget || '/'), window.location.href)
      const redirectPath = normalizePath(stripBase(redirectUrl.pathname))
      if (redirectPath === normalizedPath && redirectUrl.search === url.search && redirectUrl.hash === url.hash) {
        warnDevelopment(
          `Router route "${normalizedPath}" redirects to itself and will hit the redirect limit.`,
          { type: 'router:misconfiguration', issue: 'self-redirect', path: normalizedPath }
        )
      }

      return navigate(redirectTarget, {
        ...navigationOptions,
        replace: true,
        _redirectDepth: redirectDepth + 1
      })
    }

    const context = {
      from: current.value,
      to: destination,
      path: normalizedPath,
      search: url.search,
      hash: url.hash
    }

    if (typeof options.beforeEach === 'function') {
      const allowed = await options.beforeEach(context)

      if (allowed === false) {
        return false
      }
    }

    if (navigationOptions.replace) {
      window.history.replaceState({}, '', target)
    } else {
      window.history.pushState({}, '', target)
    }
    onPopState()

    if (url.hash) {
      const targetId = decodeURIComponent(url.hash.slice(1))
      document.getElementById(targetId)?.scrollIntoView()
    } else if (navigationOptions.scroll !== false) {
      window.scrollTo?.({ top: 0, left: 0 })
    }

    await options.afterEach?.({ ...context, route: current.value })
    return true
  }

  function link(nextPath) {
    return async event => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      event.preventDefault()
      return navigate(nextPath)
    }
  }

  try {
    onCleanup(dispose)
  } catch {
    // A router can also live outside a component scope.
  }

  const router = {
    _debugId: `router-${nextRouterId++}`,
    _debugStarted: () => started,
    path,
    search,
    hash,
    current,
    routes,
    start,
    stop,
    dispose,
    navigate,
    link
  }

  activeRouters.add(router)
  return router
}

export function getActiveRouters() {
  return [...activeRouters]
}

export function routerView(router, fallback = null) {
  return computed(() => {
    const route = router.current.value
    if (!route || typeof route.view !== 'function') {
      return fallback
    }

    return component(route.view, { ...route.params, route })
  })
}
