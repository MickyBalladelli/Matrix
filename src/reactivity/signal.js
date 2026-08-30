import { createSource, disposeSource, notifySource, subscribeSource, trackSource } from './source.js'
import { getCurrentRenderState, getCurrentScope } from './context.js'

export function signal(initialValue, options = {}) {
  const renderState = getCurrentRenderState()
  if (renderState?.isRendering) {
    const slot = renderState.stateCursor
    renderState.stateCursor += 1
    const existing = renderState.stateSlots[slot]

    if (existing) {
      if (existing.kind !== 'signal') {
        throw new Error(`Component state order changed at slot ${slot}`)
      }
      return existing.value
    }

    const value = renderState.stateScope
      ? renderState.stateScope.run(() => createSignal(initialValue, options))
      : createSignal(initialValue, options)
    renderState.stateSlots[slot] = { kind: 'signal', value }
    return value
  }

  return createSignal(initialValue, options)
}

function createSignal(initialValue, options) {
  const equals = options.equals ?? Object.is
  const source = createSource('signal', options.name ?? '')
  let value = initialValue
  let disposed = false

  const api = {
    get value() {
      if (disposed) {
        throw new Error('Cannot read a disposed signal')
      }

      trackSource(source)
      return value
    },

    set value(nextValue) {
      if (disposed) {
        throw new Error('Cannot write to a disposed signal')
      }

      if (equals(value, nextValue)) {
        return
      }

      const previousValue = value
      value = nextValue
      notifySource(source, value, previousValue)
    },

    get() {
      return api.value
    },

    set(nextValue) {
      api.value = nextValue
      return value
    },

    update(updater) {
      if (typeof updater !== 'function') {
        throw new TypeError('signal.update() expects a function')
      }

      api.value = updater(value)
      return value
    },

    peek() {
      if (disposed) {
        throw new Error('Cannot read a disposed signal')
      }

      return value
    },

    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      source.subscribers.clear()
      source.listeners.clear()
      disposeSource(source)
    },

    get name() {
      return options.name ?? ''
    },

    subscribe(listener) {
      return subscribeSource(source, listener)
    },

    get kind() {
      return source.kind
    },

    _source: source
  }

  source.read = api.peek

  const scope = getCurrentScope()
  if (scope) {
    scope.add(api.dispose)
  }

  return api
}
