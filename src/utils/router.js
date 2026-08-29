import { computed, signal } from '../reactivity/index.js'
import { component } from '../components/index.js'

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
    throw new Error('createRouter() doit être utilisé dans un navigateur')
  }

  const routes = routeDefinitions.map(route => ({
    ...route,
    matcher: compileRoute(route.path)
  }))
  const base = normalizeBase(options.base)
  const stripBase = pathname => (base && (pathname === base || pathname.startsWith(`${base}/`)))
    ? pathname.slice(base.length) || '/'
    : pathname
  const path = signal(normalizePath(stripBase(window.location.pathname)))
  const current = computed(() => matchRoute(routes, path.value))
  let started = false

  const onPopState = () => {
    path.value = normalizePath(stripBase(window.location.pathname))
  }

  function start() {
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

  function navigate(nextPath, navigationOptions = {}) {
    const normalizedPath = normalizePath(nextPath)
    const target = `${base}${normalizedPath}`
    const destination = matchRoute(routes, normalizedPath)

    if (typeof options.beforeEach === 'function') {
      const allowed = options.beforeEach({
        from: current.value,
        to: destination,
        path: normalizedPath
      })

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
    options.afterEach?.({ route: current.value, path: normalizedPath })
    return true
  }

  function link(nextPath) {
    return event => {
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
      navigate(nextPath)
    }
  }

  return {
    path,
    current,
    routes,
    start,
    stop,
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
