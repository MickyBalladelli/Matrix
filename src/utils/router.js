import { computed, signal } from '../reactivity/index.js'
import { component } from '../components/index.js'
import { onCleanup } from '../reactivity/scope.js'
import { getCurrentRenderState, runWithRenderState } from '../reactivity/context.js'

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

function matchRoute(routes, path) {
  for (const route of routes) {
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

export function createRouter(routeDefinitions = [], options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('createRouter() must be used in a browser')
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
  const routes = routeDefinitions.map(route => ({
    ...route,
    matcher: compileRoute(route.path)
  }))
  const base = normalizeBase(options.base)
  const stripBase = pathname => (base && (pathname === base || pathname.startsWith(`${base}/`)))
    ? pathname.slice(base.length) || '/'
    : pathname
  const path = signal(normalizePath(stripBase(window.location.pathname)))
  const search = signal(window.location.search)
  const hash = signal(window.location.hash)
  const current = computed(() => matchRoute(routes, path.value))
  let started = false
  let disposed = false

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
  }

  async function navigate(nextPath, navigationOptions = {}) {
    if (disposed) {
      throw new Error('Cannot navigate a disposed router')
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
    const destination = matchRoute(routes, normalizedPath)

    if (destination?.redirect) {
      const redirectTarget = typeof destination.redirect === 'function'
        ? destination.redirect({ route: destination, path: normalizedPath, search: url.search, hash: url.hash })
        : destination.redirect

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

  return {
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
