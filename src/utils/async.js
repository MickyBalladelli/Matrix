import { computed, signal } from '../reactivity/index.js'
import { onCleanup } from '../reactivity/scope.js'

export function resource(loader, options = {}) {
  if (typeof loader !== 'function') {
    throw new TypeError('resource() attend une fonction')
  }

  const status = signal('idle')
  const data = signal(options.initialValue ?? null)
  const error = signal(null)
  let requestId = 0
  let controller

  async function reload(...args) {
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
      data.value = nextData
      status.value = 'success'
      return nextData
    } catch (nextError) {
      if (currentRequest !== requestId || nextError?.name === 'AbortError') {
        return
      }
      error.value = nextError
      status.value = 'error'
      throw nextError
    }
  }

  if (options.immediate) {
    reload(...(options.args ?? [])).catch(() => {})
  }

  try {
    onCleanup(() => {
      requestId += 1
      controller?.abort()
    })
  } catch {
    // A resource can also live outside a component scope.
  }

  return {
    status,
    data,
    error,
    loading: computed(() => status.value === 'loading'),
    reload
  }
}
