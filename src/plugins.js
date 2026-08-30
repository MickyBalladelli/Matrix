import { suggestClosest } from './utils/suggestions.js'

const extensionPoints = new Map([
  ['renderer', new Set()],
  ['scheduler', new Set()],
  ['logger', new Set()],
  ['style', new Set()]
])

function getPoint(name) {
  const point = extensionPoints.get(name)
  if (!point) {
    throw new TypeError(`Unknown plugin extension point: ${name}${suggestClosest(name, [...extensionPoints.keys()])}`)
  }
  return point
}

export function emitPlugin(name, event) {
  const point = getPoint(name)
  if (point.size === 0) {
    return
  }

  for (const hook of [...point]) {
    hook(event)
  }
}

export function usePlugin(plugin) {
  if (!plugin || typeof plugin.install !== 'function') {
    throw new TypeError('usePlugin() expects a plugin with install(api)')
  }

  const registrations = []
  const api = {
    on(name, hook) {
      if (typeof hook !== 'function') {
        throw new TypeError('A plugin hook must be a function')
      }

      const point = getPoint(name)
      point.add(hook)
      const unregister = () => point.delete(hook)
      registrations.push(unregister)
      return unregister
    }
  }

  let cleanup
  try {
    cleanup = plugin.install(api)
  } catch (error) {
    for (const unregister of registrations) {
      unregister()
    }
    throw error
  }

  let disposed = false
  return () => {
    if (disposed) {
      return
    }

    disposed = true
    let firstError
    try {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    } catch (error) {
      firstError = error
    }
    for (const unregister of registrations) {
      unregister()
    }
    if (firstError) {
      throw firstError
    }
  }
}
