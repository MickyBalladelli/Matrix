function createAbortError() {
  const error = new Error('runInWorker() was aborted')
  error.name = 'AbortError'
  return error
}

function createWorkerSource(task) {
  return `
    const task = (${task.toString()})
    self.onmessage = async event => {
      try {
        self.postMessage({ ok: true, value: await task(event.data) })
      } catch (error) {
        self.postMessage({
          ok: false,
          error: {
            name: error?.name || 'Error',
            message: error?.message || String(error),
            stack: error?.stack || ''
          }
        })
      }
    }
  `
}

export function runInWorker(task, value, options = {}) {
  if (typeof task !== 'function') {
    throw new TypeError('runInWorker() expects a function')
  }

  if (typeof globalThis.Worker !== 'function' || typeof globalThis.Blob !== 'function' || typeof globalThis.URL?.createObjectURL !== 'function') {
    throw new Error('runInWorker() requires a browser Worker, Blob, and URL.createObjectURL')
  }

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('runInWorker() expects an options object')
  }

  const workerUrl = globalThis.URL.createObjectURL(new globalThis.Blob([createWorkerSource(task)], { type: 'text/javascript' }))
  const worker = new globalThis.Worker(workerUrl, {
    name: options.name ?? 'matrix-worker',
    type: 'module'
  })
  let settled = false
  let resolvePromise
  let rejectPromise

  const cleanup = () => {
    globalThis.URL.revokeObjectURL(workerUrl)
    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null
    options.signal?.removeEventListener('abort', abort)
  }

  const resolveOnce = result => {
    if (settled) {
      return
    }

    settled = true
    cleanup()
    worker.terminate()
    resolvePromise(result)
  }

  const rejectOnce = error => {
    if (settled) {
      return
    }

    settled = true
    cleanup()
    worker.terminate()
    rejectPromise(error)
  }

  const abort = () => rejectOnce(createAbortError())
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  worker.onmessage = event => {
    if (event.data?.ok) {
      resolveOnce(event.data.value)
      return
    }

    const error = new Error(event.data?.error?.message || 'Worker task failed')
    error.name = event.data?.error?.name || 'Error'
    if (event.data?.error?.stack) {
      error.stack = event.data.error.stack
    }
    rejectOnce(error)
  }
  worker.onerror = event => {
    rejectOnce(event.error || new Error(event.message || 'Worker task failed'))
  }
  worker.onmessageerror = () => {
    rejectOnce(new Error('runInWorker() could not deserialize the worker result'))
  }

  if (options.signal?.aborted) {
    abort()
  } else {
    options.signal?.addEventListener('abort', abort, { once: true })
    try {
      worker.postMessage(value, options.transfer ?? [])
    } catch (error) {
      rejectOnce(error)
    }
  }

  return promise
}
