import { emitPlugin } from '../plugins.js'

let batchDepth = 0
let flushing = false
let microtaskQueued = false

const pendingJobs = new Set()

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

  try {
    while (pendingJobs.size > 0) {
      const jobs = [...pendingJobs]
      pendingJobs.clear()

      for (const job of jobs) {
        job()
      }
    }
  } finally {
    flushing = false
    emitPlugin('scheduler', { type: 'flush:end' })
  }
}

export function batch(fn) {
  batchDepth += 1

  try {
    return fn()
  } finally {
    batchDepth -= 1

    if (batchDepth === 0) {
      flushJobs()
    }
  }
}
