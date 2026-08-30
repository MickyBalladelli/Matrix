import { computed, signal } from '../reactivity/index.js'
import { onCleanup } from '../reactivity/scope.js'
import { getCurrentRenderState, runWithRenderState } from '../reactivity/context.js'

export function resource(loader, options = {}) {
  if (typeof loader !== 'function') {
    throw new TypeError('resource() expects a function')
  }

  const renderState = getCurrentRenderState()
  if (renderState?.isRendering) {
    const slot = renderState.stateCursor
    renderState.stateCursor += 1
    const existing = renderState.stateSlots[slot]

    if (existing) {
      if (existing.kind !== 'resource') {
        throw new Error(`Component state order changed at slot ${slot}`)
      }
      return existing.value
    }

    const value = runWithRenderState(null, () => createResource(loader, options))
    renderState.stateSlots[slot] = { kind: 'resource', value }
    return value
  }

  return createResource(loader, options)
}

function createResource(loader, options) {
  const status = signal('idle')
  const data = signal(options.initialValue ?? null)
  const error = signal(null)
  let requestId = 0
  let controller
  let disposed = false
  const loading = computed(() => status.value === 'loading')

  function dispose() {
    if (disposed) {
      return
    }

    disposed = true
    requestId += 1
    controller?.abort()
    controller = null
    loading.dispose?.()
    status.dispose?.()
    data.dispose?.()
    error.dispose?.()
  }

  async function reload(...args) {
    if (disposed) {
      throw new Error('Cannot reload a disposed resource')
    }

    const currentRequest = ++requestId
    controller?.abort()
    controller = typeof AbortController === 'function' ? new AbortController() : null
    status.value = 'loading'
    error.value = null

    try {
      const nextData = await loader(...args, controller?.signal)
      if (currentRequest !== requestId) {
        return
      }
      controller = null
      data.value = nextData
      status.value = 'success'
      return nextData
    } catch (nextError) {
      if (currentRequest !== requestId || nextError?.name === 'AbortError') {
        return
      }
      controller = null
      error.value = nextError
      status.value = 'error'
      throw nextError
    }
  }

  try {
    onCleanup(dispose)
  } catch {
    // A resource can also live outside a component scope.
  }

  if (options.immediate) {
    reload(...(options.args ?? [])).catch(() => {})
  }

  return {
    status,
    data,
    error,
    loading,
    reload,
    dispose
  }
}
