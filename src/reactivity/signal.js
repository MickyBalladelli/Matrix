import { createSource, notifySource, subscribeSource, trackSource } from './source.js'
import { getCurrentRenderState, getCurrentScope } from './context.js'

export function signal(initialValue, options = {}) {
  const renderState = getCurrentRenderState()
  if (renderState?.isRendering) {
    const slot = renderState.stateCursor
    renderState.stateCursor += 1
    const existing = renderState.stateSlots[slot]

    if (existing) {
      if (existing.kind !== 'signal') {
        throw new Error(`Ordre des états local instable à la position ${slot}`)
      }
      return existing.value
    }

    const value = createSignal(initialValue, options)
    renderState.stateSlots[slot] = { kind: 'signal', value }
    return value
  }

  return createSignal(initialValue, options)
}

function createSignal(initialValue, options) {
  const equals = options.equals ?? Object.is
  const source = createSource('signal')
  let value = initialValue
  let disposed = false

  const api = {
    get value() {
      if (disposed) {
        throw new Error('Impossible de lire un signal détruit')
      }

      trackSource(source)
      return value
    },

    set value(nextValue) {
      if (disposed) {
        throw new Error('Impossible d’écrire dans un signal détruit')
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
        throw new TypeError('signal.update() attend une fonction')
      }

      api.value = updater(value)
      return value
    },

    peek() {
      if (disposed) {
        throw new Error('Impossible de lire un signal détruit')
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

  const scope = getCurrentScope()
  if (scope) {
    scope.add(api.dispose)
  }

  return api
}
