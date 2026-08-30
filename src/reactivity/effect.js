import { getCurrentScope, runWithObserver } from './context.js'
import { scheduleJob } from './scheduler.js'

const MAX_RUNS_PER_UPDATE = 100
const activeEffects = new Set()

export function effect(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('effect() expects a function')
  }

  const flushMode = options.flush ?? 'sync'
  if (flushMode !== 'sync' && flushMode !== 'microtask') {
    throw new TypeError("effect() accepts flush: 'sync' or 'microtask'")
  }

  const dependencies = new Set()
  const onError = typeof options.onError === 'function' ? options.onError : null
  let cleanup
  let running = false
  let stale = false
  let stopped = false
  let scheduled = false

  const observer = {
    kind: 'effect',
    name: options.name ?? '',
    dependencies,
    _notify() {
      if (stopped) {
        return
      }

      if (running) {
        stale = true
        return
      }

      requestRun()
    }
  }

  function removeDependencies() {
    for (const dependency of dependencies) {
      dependency.subscribers.delete(observer)
    }

    dependencies.clear()
  }

  function runCleanup() {
    if (typeof cleanup !== 'function') {
      return
    }

    const previousCleanup = cleanup
    cleanup = undefined
    previousCleanup()
  }

  function runNow() {
    if (stopped || running) {
      return
    }

    running = true
    let runCount = 0

    try {
      do {
        stale = false
        runCount += 1

        if (runCount > MAX_RUNS_PER_UPDATE) {
          throw new Error('Reactive loop detected in effect()')
        }

        runCleanup()
        removeDependencies()

        const nextCleanup = runWithObserver(observer, fn)
        if (typeof nextCleanup === 'function') {
          cleanup = nextCleanup
        }
      } while (stale && !stopped)
    } catch (error) {
      try {
        stop()
      } catch {
        // Keep the original effect error.
      }

      if (onError) {
        onError(error)
        return
      }

      throw error
    } finally {
      running = false
    }
  }

  function requestRun() {
    if (scheduled || stopped) {
      return
    }

    scheduled = true
    scheduleJob(() => {
      scheduled = false
      runNow()
    }, flushMode)
  }

  function stop() {
    if (stopped) {
      return
    }

    stopped = true
    scheduled = false
    let firstError

    try {
      runCleanup()
    } catch (error) {
      firstError = error
    }

    try {
      removeDependencies()
    } catch (error) {
      firstError ??= error
    }

    if (removeFromScope) {
      removeFromScope()
    }

    activeEffects.delete(observer)

    if (firstError) {
      throw firstError
    }
  }

  const scope = getCurrentScope()
  const removeFromScope = scope ? scope.add(stop) : null

  try {
    activeEffects.add(observer)
    runNow()
  } catch (error) {
    stop()
    throw error
  }

  return stop
}

export function getActiveEffects() {
  return [...activeEffects]
}
