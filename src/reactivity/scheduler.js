import { emitPlugin } from '../plugins.js'

let batchDepth = 0
let flushing = false
let microtaskQueued = false

const pendingJobs = new Set()

export function isBatching() {
  return batchDepth > 0
}

function queueFlush() {
  if (microtaskQueued) {
    return
  }

  microtaskQueued = true
  const flush = () => {
    microtaskQueued = false
    flushJobs()
  }

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(flush)
  } else {
    Promise.resolve().then(flush)
  }
}

export function scheduleJob(job, flushMode = 'sync') {
  emitPlugin('scheduler', { type: 'job:scheduled', flush: flushMode })

  if (flushMode === 'microtask' || batchDepth > 0) {
    pendingJobs.add(job)

    if (batchDepth === 0 || flushMode === 'microtask') {
      queueFlush()
    }

    return
  }

  job()
}

export function flushJobs() {
  if (flushing || batchDepth > 0) {
    return
  }

  flushing = true
  emitPlugin('scheduler', { type: 'flush:start', size: pendingJobs.size })

  let firstError

  try {
    while (pendingJobs.size > 0) {
      const jobs = [...pendingJobs]
      pendingJobs.clear()

      for (const job of jobs) {
        try {
          job()
        } catch (error) {
          firstError ??= error
        }
      }
    }
  } finally {
    flushing = false
    emitPlugin('scheduler', { type: 'flush:end' })
  }

  if (firstError) {
    throw firstError
  }
}

export function batch(fn) {
  batchDepth += 1
  let result
  let firstError

  try {
    result = fn()
  } catch (error) {
    firstError = error
  }

  batchDepth -= 1

  if (batchDepth === 0) {
    try {
      flushJobs()
    } catch (error) {
      firstError ??= error
    }
  }

  if (firstError) {
    throw firstError
  }

  return result
}
