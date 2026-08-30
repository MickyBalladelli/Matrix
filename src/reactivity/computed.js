import { getCurrentRenderState, getCurrentScope, runWithObserver } from './context.js'
import { createSource, notifySource, subscribeSource, trackSource } from './source.js'

export function computed(fn, options = {}) {
  const renderState = getCurrentRenderState()
  if (renderState?.isRendering) {
    const slot = renderState.stateCursor
    renderState.stateCursor += 1
    const existing = renderState.stateSlots[slot]

    if (existing) {
      if (existing.kind !== 'computed') {
        throw new Error(`Component state order changed at slot ${slot}`)
      }
      return existing.value
    }

    const value = renderState.stateScope
      ? renderState.stateScope.run(() => createComputed(fn, options))
      : createComputed(fn, options)
    renderState.stateSlots[slot] = { kind: 'computed', value }
    return value
  }

  return createComputed(fn, options)
}

function createComputed(fn, options) {
  const getter = typeof fn === 'function' ? fn : fn?.get
  const setter = fn && typeof fn === 'object' ? fn.set : undefined

  if (typeof getter !== 'function') {
    throw new TypeError('computed() expects a function')
  }
  if (setter !== undefined && typeof setter !== 'function') {
    throw new TypeError('computed() expects a valid setter')
  }

  const equals = options.equals ?? Object.is
  const source = createSource('computed', options.name ?? '')
  const dependencies = new Set()
  let value
  let dirty = true
  let computing = false
  let disposed = false

  const observer = {
    kind: 'computed',
    dependencies,
    _notify() {
      if (disposed || dirty) {
        return
      }

      dirty = true

      if (source.subscribers.size === 0 && source.listeners.size === 0) {
        return
      }

      const previousValue = value
      recompute()

      if (!equals(previousValue, value)) {
        notifySource(source, value, previousValue)
      }
    }
  }

  function removeDependencies() {
    for (const dependency of dependencies) {
      dependency.subscribers.delete(observer)
    }

    dependencies.clear()
  }

  function recompute() {
    if (!dirty || disposed) {
      return value
    }

    if (computing) {
      throw new Error('Reactive loop detected in computed()')
    }

    computing = true
    removeDependencies()

    try {
      const nextValue = runWithObserver(observer, getter)
      value = nextValue
      dirty = false
    } finally {
      computing = false
    }

    return value
  }

  const api = {
    get value() {
      if (disposed) {
        throw new Error('Cannot read a disposed computed value')
      }

      trackSource(source)
      return recompute()
    },

    get() {
      return api.value
    },

    set value(nextValue) {
      if (!setter) {
        throw new TypeError('This computed value is read-only')
      }

      setter(nextValue)
    },

    set(nextValue) {
      api.value = nextValue
      return api.value
    },

    peek() {
      return recompute()
    },

    subscribe(listener) {
      return subscribeSource(source, listener)
    },

    get kind() {
      return source.kind
    },

    get name() {
      return options.name ?? ''
    },

    _source: source
  }

  function dispose() {
    if (disposed) {
      return
    }

    disposed = true
    removeDependencies()
    source.subscribers.clear()
    source.listeners.clear()
  }

  api.dispose = dispose

  const scope = getCurrentScope()
  if (scope) {
    scope.add(dispose)
  }

  return api
}
