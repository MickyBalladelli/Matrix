import { getCurrentScope, runWithScope } from './context.js'

function runCleanup(cleanup) {
  if (typeof cleanup === 'function') {
    cleanup()
  }
}

export function createScope(parent = getCurrentScope()) {
  const children = new Set()
  const cleanups = new Set()

  let disposed = false

  const scope = {
    get disposed() {
      return disposed
    },

    run(fn) {
      if (disposed) {
        throw new Error('Cannot use a disposed scope')
      }

      return runWithScope(scope, fn)
    },

    add(cleanup) {
      if (typeof cleanup !== 'function') {
        throw new TypeError('A cleanup must be a function')
      }

      if (disposed) {
        runCleanup(cleanup)
        return () => {}
      }

      cleanups.add(cleanup)

      return () => {
        cleanups.delete(cleanup)
      }
    },

    dispose() {
      if (disposed) {
        return
      }

      disposed = true

      let firstError

      for (const child of [...children]) {
        try {
          child.dispose()
        } catch (error) {
          firstError ??= error
        }
      }
      children.clear()

      for (const cleanup of [...cleanups]) {
        cleanups.delete(cleanup)

        try {
          runCleanup(cleanup)
        } catch (error) {
          firstError ??= error
        }
      }

      if (parent) {
        parent._children.delete(scope)
      }

      if (firstError) {
        throw firstError
      }
    },

    _children: children
  }

  if (parent) {
    parent._children.add(scope)
  }

  return scope
}

export function disposeScope(scope) {
  if (!scope || typeof scope.dispose !== 'function') {
    throw new TypeError('disposeScope() expects a valid scope')
  }

  scope.dispose()
}

export function onCleanup(cleanup) {
  const scope = getCurrentScope()

  if (!scope) {
    throw new Error('onCleanup() must be called inside an active scope')
  }

  return scope.add(cleanup)
}
